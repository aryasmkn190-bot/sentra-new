"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/session";
import { transitionOrder } from "@/lib/orders";

async function requireAdmin() {
  const session = await getSession("admin");
  if (!session) return null;
  return db.adminUser.findFirst({ where: { id: session.sub, status: "active" }, include: { role: true } });
}

async function audit(adminId: string, action: string, entityType: string, entityId: string, after?: unknown) {
  await db.auditLog.create({
    data: {
      admin_user_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      after_data: after ? JSON.parse(JSON.stringify(after)) : undefined,
    },
  });
}

export async function adminLogin(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || admin.status !== "active" || !(await bcrypt.compare(password, admin.password_hash))) {
    return { error: "Email atau kata sandi salah." };
  }
  await createSession("admin", admin.id);
  redirect("/admin");
}

export async function adminLogout() {
  await destroySession("admin");
  redirect("/admin/login");
}

/** FR-11.1 — CRUD produk. */
export async function upsertProduct(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const categoryId = String(formData.get("category_id") || "");
  const basePrice = parseInt(String(formData.get("base_price") || "0"), 10);
  const compareAtRaw = String(formData.get("compare_at_price") || "").trim();
  const imageUrl = String(formData.get("image_url") || "").trim();
  const data = {
    name,
    category_id: categoryId,
    base_price: basePrice,
    compare_at_price: compareAtRaw ? parseInt(compareAtRaw, 10) : null,
    unit: String(formData.get("unit") || "pcs"),
    description: String(formData.get("description") || ""),
    max_qty_per_order: parseInt(String(formData.get("max_qty_per_order") || "10"), 10),
    status: String(formData.get("status") || "active"),
  };
  if (!name || !categoryId || !basePrice) return { error: "Nama, kategori, dan harga wajib diisi." };

  if (id) {
    const product = await db.product.update({ where: { id }, data });
    if (imageUrl) {
      await db.productImage.deleteMany({ where: { product_id: product.id } });
      await db.productImage.create({
        data: { product_id: product.id, image_url: imageUrl, is_primary: true }
      });
    }
    await audit(admin.id, "update", "product", product.id, data);
  } else {
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 5)}`;
    const count = await db.product.count();
    const product = await db.product.create({
      data: { ...data, slug, sku: `SKU-${String(count + 1).padStart(4, "0")}` },
    });
    if (imageUrl) {
      await db.productImage.create({
        data: { product_id: product.id, image_url: imageUrl, is_primary: true }
      });
    }
    // Buat baris stok 0 di semua hub aktif agar langsung terlihat di inventori
    const hubs = await db.hub.findMany({ where: { is_active: true } });
    for (const hub of hubs) {
      await db.hubStock.create({ data: { hub_id: hub.id, product_id: product.id, stock_qty: 0 } });
    }
    await audit(admin.id, "create", "product", product.id, data);
  }
  revalidatePath("/admin/produk");
  return { ok: true };
}

/** FR-11.2 — penyesuaian stok (opname / barang masuk). */
export async function adjustStock(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const hubStockId = String(formData.get("hub_stock_id"));
  const delta = parseInt(String(formData.get("delta") || "0"), 10);
  const note = String(formData.get("note") || "penyesuaian admin");
  if (!delta) return { error: "Isi jumlah penyesuaian (bisa negatif)." };

  await db.$transaction(async (tx) => {
    await tx.hubStock.update({
      where: { id: hubStockId },
      data: { stock_qty: { increment: delta } },
    });
    await tx.stockMovement.create({
      data: {
        hub_stock_id: hubStockId,
        type: delta > 0 ? "in" : "adjustment",
        qty: Math.abs(delta),
        reference_type: "opname",
        note,
        created_by: admin.id,
      },
    });
  });
  await audit(admin.id, "update", "hub_stock", hubStockId, { delta, note });
  revalidatePath("/admin/inventori");
  return { ok: true };
}

/** FR-11.3 — override status order (edge case) & proses refund. */
export async function adminSetOrderStatus(orderId: string, toStatus: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order tidak ditemukan." };
  await db.$transaction(async (tx) => {
    await transitionOrder(tx, orderId, order.status, toStatus, "admin", admin.id, "Override manual admin");
  });
  await audit(admin.id, "update", "order", orderId, { toStatus });
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath("/admin/pesanan");
  return { ok: true };
}

const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "picking",
  "packed",
  "on_delivery",
  "arrived",
  "completed",
  "cancelled",
  "refunded",
] as const;

export async function getOrders(page?: number, q?: string, status?: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.OR = [
      { order_number: { contains: query, mode: "insensitive" } },
      { user: { phone_number: { contains: query } } },
      { user: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  if (statusFilter !== "all" && ORDER_STATUSES.includes(statusFilter as any)) {
    where.status = statusFilter;
  }

  const [items, totalItems] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        created_at: true,
        user: { select: { phone_number: true, name: true } },
        hub: { select: { code: true, name: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return { items, totalItems, currentPage };
}

export async function bulkUpdateOrderStatus(orderIds: string[], toStatus: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  if (!Array.isArray(orderIds) || orderIds.length === 0) return { error: "Pilih minimal 1 pesanan." };
  if (!ORDER_STATUSES.includes(toStatus as any)) return { error: "Status tidak valid." };

  const ids = Array.from(new Set(orderIds.filter(Boolean))).slice(0, 100);
  const orders = await db.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });
  if (orders.length === 0) return { error: "Pesanan tidak ditemukan." };

  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const order of orders) {
      if (order.status === toStatus) continue;
      await transitionOrder(tx, order.id, order.status, toStatus, "admin", admin.id, "Bulk update admin");
      updated += 1;
    }
  });

  await audit(admin.id, "bulk_update", "order", ids.join(","), { toStatus, count: updated, ids });
  revalidatePath("/admin/pesanan");
  return { ok: true, updated };
}

export async function getOrder(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, phone_number: true } },
      items: true,
      payments: true,
      refunds: true,
      status_histories: { orderBy: { created_at: "asc" } },
      picking_task: { include: { picker: { select: { name: true } } } },
      delivery_task: { include: { driver: { select: { name: true } } } },
      dropPoint: { select: { name: true } },
      hub: { select: { code: true, name: true } },
    },
  });
}

export async function processRefund(refundId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  // TODO produksi: panggil API refund gateway (Midtrans/Xendit) di sini, lalu tandai processed.
  await db.refund.update({
    where: { id: refundId },
    data: { status: "processed", processed_by: admin.id },
  });
  await audit(admin.id, "update", "refund", refundId, { status: "processed" });
  revalidatePath("/admin/pesanan", "layout");
  return { ok: true };
}

/** FR-11.4 — buat voucher. */
export async function createVoucher(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const code = String(formData.get("code") || "").toUpperCase().trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "fixed");
  const value = parseInt(String(formData.get("value") || "0"), 10);
  if (!code || !name || (!value && type !== "free_delivery")) return { error: "Kode, nama, dan nilai wajib diisi." };

  const maxDiscountRaw = String(formData.get("max_discount") || "").trim();
  try {
    const voucher = await db.voucher.create({
      data: {
        code,
        name,
        type,
        value: type === "free_delivery" ? 0 : value,
        max_discount: maxDiscountRaw ? parseInt(maxDiscountRaw, 10) : null,
        min_order_amount: parseInt(String(formData.get("min_order_amount") || "0"), 10),
        quota_total: parseInt(String(formData.get("quota_total") || "100"), 10),
        quota_per_user: parseInt(String(formData.get("quota_per_user") || "1"), 10),
        target_segment: String(formData.get("target_segment") || "all"),
        start_at: new Date(String(formData.get("start_at"))),
        end_at: new Date(String(formData.get("end_at"))),
      },
    });
    await audit(admin.id, "create", "voucher", voucher.id, { code, type, value });
  } catch {
    return { error: "Kode voucher sudah dipakai." };
  }
  revalidatePath("/admin/voucher");
  return { ok: true };
}

/** CRUD Banner Promosi Dinamis */
export async function upsertBanner(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const imageUrl = String(formData.get("image_url") || "").trim();
  const targetUrl = String(formData.get("target_url") || "/").trim();
  const placement = String(formData.get("placement") || "home_top");
  const sortOrder = parseInt(String(formData.get("sort_order") || "0"), 10);
  const startAt = new Date(String(formData.get("start_at")));
  const endAt = new Date(String(formData.get("end_at")));

  if (!title || isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return { error: "Judul, tanggal mulai, dan tanggal selesai wajib diisi dengan benar." };
  }

  const data = {
    title,
    image_url: imageUrl,
    target_url: targetUrl,
    placement,
    sort_order: sortOrder,
    start_at: startAt,
    end_at: endAt,
    is_active: formData.get("is_active") === "true",
  };

  if (id) {
    const banner = await db.banner.update({ where: { id }, data });
    await audit(admin.id, "update", "banner", banner.id, data);
  } else {
    const banner = await db.banner.create({ data });
    await audit(admin.id, "create", "banner", banner.id, data);
  }
  revalidatePath("/");
  revalidatePath("/admin/banner");
  return { ok: true };
}

export async function deleteBanner(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  await db.banner.delete({ where: { id } });
  await audit(admin.id, "delete", "banner", id);
  revalidatePath("/");
  revalidatePath("/admin/banner");
  return { ok: true };
}

export async function getProducts(page?: number, q?: string, status?: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }
  if (statusFilter === "active") where.status = "active";
  if (statusFilter === "inactive") where.status = "inactive";
  if (statusFilter === "archived") where.status = "archived";

  const [items, totalItems] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, images: { where: { is_primary: true }, take: 1 } },
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.product.count({ where }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      base_price: p.base_price,
      compare_at_price: p.compare_at_price,
      unit: p.unit,
      description: p.description,
      max_qty_per_order: p.max_qty_per_order,
      status: p.status,
      category_id: p.category_id,
      category: p.category,
      image_url: p.images[0]?.image_url ?? null,
    })),
    totalItems,
    currentPage,
  };
}

export async function getCategories() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const categories = await db.category.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

  return categories.map((c) => ({ id: c.id, name: c.name }));
}

export async function getProduct(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const product = await db.product.findUnique({
    where: { id },
    include: { images: { where: { is_primary: true }, take: 1 } },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    base_price: product.base_price,
    compare_at_price: product.compare_at_price,
    unit: product.unit,
    description: product.description,
    max_qty_per_order: product.max_qty_per_order,
    status: product.status,
    image_url: product.images[0]?.image_url ?? null,
  };
}

export async function getVouchers(page?: number, q?: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();

  const where: any = {};
  if (query) {
    where.OR = [
      { code: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    db.voucher.findMany({
      where,
      include: { _count: { select: { usages: true } } },
      orderBy: { start_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.voucher.count({ where }),
  ]);

  return { items, totalItems, currentPage };
}

// ===================== USER MANAGEMENT =====================

export async function getUsers(page?: number, q?: string, status?: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phone_number: { contains: query } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }
  if (statusFilter === "active") where.status = "active";
  if (statusFilter === "blocked") where.status = "blocked";

  const [items, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, phone_number: true, email: true,
        status: true, created_at: true, is_age_verified: true,
        date_of_birth: true, referral_code: true,
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return { items, totalItems, currentPage };
}

export async function getUser(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;
  return db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, phone_number: true, email: true,
      status: true, is_age_verified: true, date_of_birth: true,
      referral_code: true, created_at: true,
    },
  });
}

export async function updateUser(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const status = String(formData.get("status") || "active");
  const is_age_verified = formData.get("is_age_verified") === "on";
  const dobRaw = String(formData.get("date_of_birth") || "").trim();
  const date_of_birth = dobRaw ? new Date(dobRaw) : null;

  if (!id) return { ok: false, error: "ID user tidak ditemukan." };
  if (!name) return { ok: false, error: "Nama tidak boleh kosong." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Format email tidak valid." };

  const updated = await db.user.update({
    where: { id },
    data: { name, email, status, is_age_verified, date_of_birth },
  });

  await audit(admin.id, "UPDATE_USER", "User", id, updated);
  return { ok: true };
}

export async function toggleUserStatus(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { ok: false, error: "User tidak ditemukan." };

  const newStatus = user.status === "active" ? "blocked" : "active";
  await db.user.update({ where: { id }, data: { status: newStatus } });
  await audit(admin.id, "TOGGLE_USER_STATUS", "User", id, { from: user.status, to: newStatus });
  return { ok: true };
}

export async function getBanners(page?: number, q?: string, status?: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.title = { contains: query, mode: "insensitive" };
  }
  if (statusFilter === "active") where.is_active = true;
  if (statusFilter === "inactive") where.is_active = false;

  const [items, totalItems] = await Promise.all([
    db.banner.findMany({
      where,
      orderBy: { sort_order: "asc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.banner.count({ where }),
  ]);

  return { items, totalItems, currentPage };
}
