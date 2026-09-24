"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/session";
import { transitionOrder } from "@/lib/orders";
import { hhmmToMinute } from "@/lib/vouchers";

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

/** FR-11.1 — CRUD produk (field umum saja). Varian/stok/harga/foto di section varian. */
export async function upsertProduct(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const categoryId = String(formData.get("category_id") || "");
  const description = String(formData.get("description") || "");
  const maxQty = parseInt(String(formData.get("max_qty_per_order") || "10"), 10) || 10;
  const status = String(formData.get("status") || "active");
  // variants_json hanya saat create: [{name,unit,base_price,compare_at_price?,stock?,images?[]}]
  const variantsRaw = String(formData.get("variants_json") || "").trim();

  if (!name || !categoryId) return { error: "Nama dan kategori wajib diisi." };

  type DraftVariant = {
    name: string;
    unit?: string;
    base_price: number;
    compare_at_price?: number | null;
    stock?: number;
    images?: string[];
    is_default?: boolean;
  };

  let drafts: DraftVariant[] = [];
  if (!id && variantsRaw) {
    try {
      drafts = JSON.parse(variantsRaw);
      if (!Array.isArray(drafts) || drafts.length === 0) {
        return { error: "Minimal 1 varian wajib saat buat produk." };
      }
    } catch {
      return { error: "Data varian tidak valid." };
    }
  }

  try {
    if (id) {
      // Update: hanya field universal
      const product = await db.product.update({
        where: { id },
        data: {
          name,
          category_id: categoryId,
          description,
          max_qty_per_order: maxQty,
          status,
        },
      });
      await audit(admin.id, "update", "product", product.id, { name, categoryId, status });
      revalidatePath("/admin/produk");
      revalidatePath("/", "layout");
      return { ok: true as const, productId: product.id };
    }

    // Create + varian awal
    if (drafts.length === 0) {
      drafts = [{ name: "Standar", unit: "pcs", base_price: 0, stock: 0, images: [], is_default: true }];
    }
    // validasi
    for (const d of drafts) {
      if (!d.name?.trim() || !d.base_price || d.base_price <= 0) {
        return { error: "Setiap varian wajib nama dan harga > 0." };
      }
    }

    const minPrice = Math.min(...drafts.map((d) => d.base_price));
    const defDraft = drafts.find((d) => d.is_default) ?? drafts[0];
    const slugBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 5)}`;
    const count = await db.product.count();
    const sku = `SKU-${String(count + 1).padStart(4, "0")}`;

    const product = await db.product.create({
      data: {
        name,
        category_id: categoryId,
        description,
        max_qty_per_order: maxQty,
        status,
        slug,
        sku,
        unit: defDraft.unit || "pcs",
        base_price: minPrice,
        compare_at_price: defDraft.compare_at_price ?? null,
      },
    });

    const hubs = await db.hub.findMany({ where: { is_active: true } });
    let defaultVariantId: string | null = null;

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const isDef = d === defDraft || (i === 0 && !drafts.some((x) => x.is_default));
      const vSku = i === 0 ? `${sku}-DEF` : `${sku}-V${String(i + 1).padStart(2, "0")}`;
      const variant = await db.productVariant.create({
        data: {
          product_id: product.id,
          sku: vSku,
          name: d.name.trim(),
          unit: (d.unit || "pcs").trim() || "pcs",
          base_price: d.base_price,
          compare_at_price: d.compare_at_price ?? null,
          is_default: isDef,
          is_active: true,
          sort_order: i,
        },
      });
      if (isDef) defaultVariantId = variant.id;

      const imgs = (d.images || []).map((u) => String(u).trim()).filter(Boolean);
      for (let j = 0; j < imgs.length; j++) {
        await db.productImage.create({
          data: {
            product_id: product.id,
            variant_id: variant.id,
            image_url: imgs[j],
            sort_order: j,
            is_primary: j === 0,
          },
        });
      }

      const stockQty = Math.max(0, parseInt(String(d.stock ?? 0), 10) || 0);
      for (const hub of hubs) {
        await db.hubStock.create({
          data: {
            hub_id: hub.id,
            product_id: product.id,
            variant_id: variant.id,
            stock_qty: stockQty,
          },
        });
      }
    }

    // fallback display image: primary dari default variant
    if (defaultVariantId) {
      const firstImg = await db.productImage.findFirst({
        where: { variant_id: defaultVariantId },
        orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
      });
      // product-level mirror for legacy readers (optional, keep if exists)
      if (firstImg) {
        await db.productImage.create({
          data: {
            product_id: product.id,
            variant_id: null,
            image_url: firstImg.image_url,
            sort_order: 0,
            is_primary: true,
          },
        });
      }
    }

    await audit(admin.id, "create", "product", product.id, { name, drafts: drafts.length });
    revalidatePath("/admin/produk");
    revalidatePath("/", "layout");
    return { ok: true as const, productId: product.id };
  } catch (e) {
    console.error("upsertProduct", e);
    return { error: "Gagal simpan produk." };
  }
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

/** Laporan khusus Pesanan Online Storefront — rekap omzet, voucher, shipping, & top produk */
export async function getOnlineOrderReport(
  period: "today" | "7d" | "30d" | "all" | "custom" = "30d",
  startDateStr?: string,
  endDateStr?: string
) {
  const admin = await requireAdmin();
  if (!admin) return null;

  let gte: Date | undefined;
  let lte: Date | undefined;
  const now = new Date();

  if (period === "today") {
    gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "7d") {
    gte = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  } else if (period === "30d") {
    gte = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  } else if (period === "custom") {
    if (startDateStr) {
      gte = new Date(startDateStr);
      gte.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      lte = new Date(endDateStr);
      lte.setHours(23, 59, 59, 999);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdFilter: any = {};
  if (gte) createdFilter.gte = gte;
  if (lte) createdFilter.lte = lte;

  const whereDate = (gte || lte) ? { created_at: createdFilter } : {};

  const [totalOrders, completedAgg, statusCounts, topProductsRaw, recentOrders] = await Promise.all([
    db.order.count({ where: whereDate }),
    db.order.aggregate({
      where: { ...whereDate, status: "completed" },
      _sum: {
        total_amount: true,
        subtotal_amount: true,
        discount_amount: true,
        delivery_fee: true,
      },
      _count: { _all: true },
    }),
    db.order.groupBy({
      by: ["status"],
      where: whereDate,
      _count: { _all: true },
    }),
    db.orderItem.groupBy({
      by: ["product_id", "product_name_snapshot"],
      where: {
        order: { ...whereDate, status: "completed" },
        status: { in: ["fulfilled", "substituted"] },
      },
      _sum: { qty_fulfilled: true, qty_ordered: true, subtotal: true },
      _count: { _all: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    db.order.findMany({
      where: whereDate,
      include: {
        user: { select: { name: true, phone_number: true } },
        items: { take: 2 },
      },
      orderBy: { created_at: "desc" },
      take: 15,
    }),
  ]);

  const totalOmzet = completedAgg._sum.total_amount || 0;
  const totalSubtotal = completedAgg._sum.subtotal_amount || 0;
  const totalDiscount = completedAgg._sum.discount_amount || 0;
  const totalDeliveryFee = completedAgg._sum.delivery_fee || 0;
  const completedCount = completedAgg._count._all || 0;

  const counts: Record<string, number> = {
    pending_payment: 0,
    confirmed: 0,
    picking: 0,
    packed: 0,
    on_delivery: 0,
    arrived: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  };
  statusCounts.forEach((s) => {
    counts[s.status] = s._count._all;
  });

  const topProducts = topProductsRaw.map((p) => {
    const qty = (p._sum.qty_fulfilled && p._sum.qty_fulfilled > 0) ? p._sum.qty_fulfilled : (p._sum.qty_ordered || 0);
    return {
      productId: p.product_id,
      name: p.product_name_snapshot,
      totalQty: qty,
      totalRevenue: p._sum.subtotal || 0,
      orderCount: p._count._all,
    };
  });

  return {
    period,
    summary: {
      totalOrders,
      completedCount,
      totalOmzet,
      totalSubtotal,
      totalDiscount,
      totalDeliveryFee,
      counts,
    },
    topProducts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      user_name: o.user.name || o.user.phone_number,
      user_phone: o.user.phone_number,
      total_amount: o.total_amount,
      status: o.status,
      created_at: o.created_at.toISOString(),
      item_count: o.items.length,
      item_preview: o.items.map((i) => `${i.product_name_snapshot} (${i.qty_ordered})`).join(", "),
    })),
  };
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

/** FR-11.4 — buat / ubah voucher. */
export async function upsertVoucher(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const id = String(formData.get("id") || "");
  const code = String(formData.get("code") || "").toUpperCase().trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "fixed");
  const value = parseInt(String(formData.get("value") || "0"), 10);
  if (!code || !name || (!value && type !== "free_delivery")) return { error: "Kode, nama, dan nilai wajib diisi." };

  const maxDiscountRaw = String(formData.get("max_discount") || "").trim();
  const startMinute = hhmmToMinute(String(formData.get("start_time") || ""));
  const endMinute = hhmmToMinute(String(formData.get("end_time") || ""));
  if (startMinute !== null && endMinute !== null && startMinute === endMinute)
    return { error: "Jam mulai dan jam selesai tidak boleh sama." };

  const data = {
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
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    product_ids: formData.getAll("product_id").map(String).filter(Boolean),
    category_ids: formData.getAll("category_id").map(String).filter(Boolean),
    bundle_only: formData.get("bundle_only") === "on" || formData.get("bundle_only") === "true",
    bundle_ids: formData.getAll("bundle_id").map(String).filter(Boolean),
    days_of_week: formData.getAll("day").map((d) => parseInt(String(d), 10)).filter((n) => !isNaN(n)),
    start_minute: startMinute,
    end_minute: endMinute,
  };

  try {
    if (id) {
      const voucher = await db.voucher.update({ where: { id }, data });
      await audit(admin.id, "update", "voucher", voucher.id, { code, type, value, is_active: data.is_active });
    } else {
      const voucher = await db.voucher.create({ data });
      await audit(admin.id, "create", "voucher", voucher.id, { code, type, value });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Kode voucher sudah dipakai." };
    return { error: "Gagal menyimpan voucher." };
  }
  revalidatePath("/admin/voucher");
  return { ok: true };
}

/** FR-11.4 — hapus voucher (ditolak bila sudah terpakai). */
export async function deleteVoucher(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const used = await db.voucherUsage.count({ where: { voucher_id: id } });
  if (used > 0) return { error: `Voucher sudah dipakai ${used}× — tidak bisa dihapus. Nonaktifkan saja.` };

  await db.voucher.delete({ where: { id } });
  await audit(admin.id, "delete", "voucher", id);
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
      { variants: { some: { sku: { contains: query, mode: "insensitive" } } } },
    ];
  }
  if (statusFilter === "active") where.status = "active";
  if (statusFilter === "inactive") where.status = "inactive";
  if (statusFilter === "archived") where.status = "archived";

  const [items, totalItems] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        images: {
          where: { is_primary: true },
          take: 3,
          orderBy: [{ variant_id: "asc" }, { sort_order: "asc" }],
        },
        variants: {
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
          include: {
            hub_stocks: { select: { stock_qty: true, reserved_qty: true } },
            images: {
              orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
              take: 1,
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.product.count({ where }),
  ]);

  return {
    items: items.map((p) => {
      const prices = p.variants.map((v) => v.base_price);
      const totalStock = p.variants.reduce(
        (sum, v) => sum + v.hub_stocks.reduce((s, hs) => s + hs.stock_qty, 0),
        0
      );
      const minPrice = prices.length ? Math.min(...prices) : p.base_price;
      const maxPrice = prices.length ? Math.max(...prices) : p.base_price;
      const defVar = p.variants.find((v) => v.is_default) ?? p.variants[0];
      const image_url =
        defVar?.images?.[0]?.image_url ??
        p.images.find((i) => !i.variant_id)?.image_url ??
        p.images[0]?.image_url ??
        null;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        base_price: p.base_price,
        min_price: minPrice,
        max_price: maxPrice,
        compare_at_price: p.compare_at_price,
        unit: p.unit,
        description: p.description,
        max_qty_per_order: p.max_qty_per_order,
        status: p.status,
        category_id: p.category_id,
        category: p.category,
        image_url,
        sold_count: p.sold_count,
        rating_avg: p.rating_avg,
        rating_count: p.rating_count,
        variant_count: p.variants.length,
        total_stock: totalStock,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          unit: v.unit,
          base_price: v.base_price,
          is_default: v.is_default,
          is_active: v.is_active,
          stock_qty: v.hub_stocks.reduce((s, hs) => s + hs.stock_qty, 0),
          reserved_qty: v.hub_stocks.reduce((s, hs) => s + hs.reserved_qty, 0),
        })),
      };
    }),
    totalItems,
    currentPage,
  };
}

/** Stok per varian untuk modal Atur Stok (pola Shopee). */
export async function getProductStockRows(productId: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      variants: {
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: {
          hub_stocks: {
            include: { hub: { select: { id: true, name: true, code: true } } },
            orderBy: { hub: { code: "asc" } },
          },
        },
      },
    },
  });
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    variants: product.variants.map((v) => {
      const stock_qty = v.hub_stocks.reduce((s, hs) => s + hs.stock_qty, 0);
      const reserved_qty = v.hub_stocks.reduce((s, hs) => s + hs.reserved_qty, 0);
      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        unit: v.unit,
        base_price: v.base_price,
        is_active: v.is_active,
        stock_qty,
        reserved_qty,
        available: Math.max(stock_qty - reserved_qty, 0),
        // 1 hub aktif saat ini — pakai row pertama / buat jika kosong
        hub_stock_id: v.hub_stocks[0]?.id ?? null,
        hub_id: v.hub_stocks[0]?.hub_id ?? null,
      };
    }),
  };
}

/**
 * Set stok absolut per varian (modal Atur Stok).
 * Form: product_id + stock_<variantId>=qty (+ optional bulk).
 */
export async function setProductStocks(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const productId = String(formData.get("product_id") || "");
  if (!productId) return { error: "Produk wajib." };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      variants: { include: { hub_stocks: true } },
    },
  });
  if (!product) return { error: "Produk tidak ditemukan." };

  const hubs = await db.hub.findMany({ where: { is_active: true } });
  if (hubs.length === 0) return { error: "Tidak ada hub aktif." };

  try {
    await db.$transaction(async (tx) => {
      for (const v of product.variants) {
        const raw = formData.get(`stock_${v.id}`);
        if (raw === null || raw === undefined || String(raw).trim() === "") continue;
        const nextQty = Math.max(0, parseInt(String(raw), 10) || 0);

        // pastikan ada hub_stock di tiap hub aktif
        for (const hub of hubs) {
          let hs = v.hub_stocks.find((x) => x.hub_id === hub.id);
          if (!hs) {
            hs = await tx.hubStock.create({
              data: {
                hub_id: hub.id,
                product_id: productId,
                variant_id: v.id,
                stock_qty: 0,
              },
            });
          }
          const prev = hs.stock_qty;
          // jaga reserved: stock_qty tidak boleh < reserved_qty
          const safeQty = Math.max(nextQty, hs.reserved_qty);
          if (safeQty === prev) continue;
          await tx.hubStock.update({
            where: { id: hs.id },
            data: { stock_qty: safeQty },
          });
          await tx.stockMovement.create({
            data: {
              hub_stock_id: hs.id,
              type: safeQty > prev ? "in" : "adjustment",
              qty: Math.abs(safeQty - prev),
              reference_type: "opname",
              note: "Atur stok (admin produk)",
              created_by: admin.id,
            },
          });
        }
      }
    });

    await audit(admin.id, "update", "product_stock", productId, null);
    revalidatePath("/admin/produk");
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (e) {
    console.error("setProductStocks", e);
    return { error: "Gagal update stok." };
  }
}

/**
 * Set harga absolut per varian (modal Atur Harga — pola Shopee).
 * Form: product_id + price_<variantId>=qty (+ optional compare_<id>).
 */
export async function setProductPrices(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const productId = String(formData.get("product_id") || "");
  if (!productId) return { error: "Produk wajib." };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) return { error: "Produk tidak ditemukan." };

  try {
    let minPrice = Number.POSITIVE_INFINITY;
    let defaultPrice: number | null = null;
    let defaultCompare: number | null = null;
    let defaultUnit = product.unit;

    for (const v of product.variants) {
      const raw = formData.get(`price_${v.id}`);
      if (raw === null || raw === undefined || String(raw).trim() === "") continue;
      const price = parseInt(String(raw), 10);
      if (!price || price <= 0 || Number.isNaN(price)) {
        return { error: `Harga tidak valid untuk ${v.name}.` };
      }
      const compareRaw = String(formData.get(`compare_${v.id}`) || "").trim();
      const compare_at_price = compareRaw ? parseInt(compareRaw, 10) : null;

      const updated = await db.productVariant.update({
        where: { id: v.id },
        data: {
          base_price: price,
          ...(compareRaw !== "" ? { compare_at_price } : {}),
        },
      });
      if (updated.is_active && price < minPrice) minPrice = price;
      if (updated.is_default) {
        defaultPrice = price;
        defaultCompare = compareRaw !== "" ? compare_at_price : updated.compare_at_price;
        defaultUnit = updated.unit;
      }
    }

    if (minPrice === Number.POSITIVE_INFINITY) {
      // no prices submitted — nothing to do
      return { ok: true as const };
    }

    await db.product.update({
      where: { id: productId },
      data: {
        base_price: defaultPrice ?? minPrice,
        ...(defaultPrice != null
          ? { compare_at_price: defaultCompare, unit: defaultUnit }
          : {}),
      },
    });

    await audit(admin.id, "update", "product_price", productId, null);
    revalidatePath("/admin/produk");
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (e) {
    console.error("setProductPrices", e);
    return { error: "Gagal update harga." };
  }
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
    include: {
      variants: {
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: {
          images: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }] },
          hub_stocks: { select: { stock_qty: true, reserved_qty: true } },
        },
      },
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    description: product.description,
    max_qty_per_order: product.max_qty_per_order,
    status: product.status,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      unit: v.unit,
      base_price: v.base_price,
      compare_at_price: v.compare_at_price,
      is_default: v.is_default,
      is_active: v.is_active,
      sort_order: v.sort_order,
      stock_qty: v.hub_stocks.reduce((s, hs) => s + hs.stock_qty, 0),
      images: v.images.map((img) => ({
        id: img.id,
        image_url: img.image_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      })),
    })),
  };
}

/** CRUD varian produk (ukuran/jumlah/kemasan + foto). */
export async function upsertProductVariant(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Masuk kembali." };

  const productId = String(formData.get("product_id") || "");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const unit = String(formData.get("unit") || "pcs").trim() || "pcs";
  const basePrice = parseInt(String(formData.get("base_price") || "0"), 10);
  const compareAtRaw = String(formData.get("compare_at_price") || "").trim();
  const isDefault = String(formData.get("is_default") || "") === "1";
  const isActive = String(formData.get("is_active") || "") !== "0";
  const sortOrder = parseInt(String(formData.get("sort_order") || "0"), 10) || 0;
  const stockRaw = String(formData.get("stock_qty") || "").trim();
  const imagesRaw = String(formData.get("images_json") || "[]");

  if (!productId || !name || !basePrice || Number.isNaN(basePrice)) {
    return { error: "Produk, nama varian, dan harga wajib diisi." };
  }
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Produk tidak ditemukan." };

  const compare_at_price = compareAtRaw ? parseInt(compareAtRaw, 10) : null;
  let imageUrls: string[] = [];
  try {
    const parsed = JSON.parse(imagesRaw);
    if (Array.isArray(parsed)) imageUrls = parsed.map((u) => String(u).trim()).filter(Boolean);
  } catch {
    /* ignore */
  }

  try {
    let variantId = id;
    let row;
    if (id) {
      row = await db.productVariant.update({
        where: { id },
        data: {
          name,
          unit,
          base_price: basePrice,
          compare_at_price,
          is_default: isDefault,
          is_active: isActive,
          sort_order: sortOrder,
        },
      });
    } else {
      const count = await db.productVariant.count({ where: { product_id: productId } });
      let sku = "";
      for (let n = count + 1; n < count + 50; n++) {
        const candidate = `${product.sku}-V${String(n).padStart(2, "0")}`;
        const exists = await db.productVariant.findUnique({ where: { sku: candidate } });
        if (!exists) {
          sku = candidate;
          break;
        }
      }
      if (!sku) sku = `${product.sku}-V${Date.now().toString(36).slice(-4).toUpperCase()}`;

      row = await db.productVariant.create({
        data: {
          product_id: productId,
          sku,
          name,
          unit,
          base_price: basePrice,
          compare_at_price,
          is_default: isDefault || count === 0,
          is_active: isActive,
          sort_order: sortOrder || count,
        },
      });
      variantId = row.id;
      const hubs = await db.hub.findMany({ where: { is_active: true } });
      for (const hub of hubs) {
        await db.hubStock.upsert({
          where: { hub_id_variant_id: { hub_id: hub.id, variant_id: row.id } },
          update: {},
          create: {
            hub_id: hub.id,
            product_id: productId,
            variant_id: row.id,
            stock_qty: 0,
          },
        });
      }
    }

    // replace images for this variant
    await db.productImage.deleteMany({ where: { variant_id: variantId } });
    for (let j = 0; j < imageUrls.length; j++) {
      await db.productImage.create({
        data: {
          product_id: productId,
          variant_id: variantId,
          image_url: imageUrls[j],
          sort_order: j,
          is_primary: j === 0,
        },
      });
    }

    // optional stock set
    if (stockRaw !== "") {
      const nextQty = Math.max(0, parseInt(stockRaw, 10) || 0);
      const hubs = await db.hub.findMany({ where: { is_active: true } });
      for (const hub of hubs) {
        const hs = await db.hubStock.findUnique({
          where: { hub_id_variant_id: { hub_id: hub.id, variant_id: variantId } },
        });
        if (hs) {
          const safeQty = Math.max(nextQty, hs.reserved_qty);
          if (safeQty !== hs.stock_qty) {
            await db.hubStock.update({ where: { id: hs.id }, data: { stock_qty: safeQty } });
          }
        } else {
          await db.hubStock.create({
            data: {
              hub_id: hub.id,
              product_id: productId,
              variant_id: variantId,
              stock_qty: nextQty,
            },
          });
        }
      }
    }

    if (isDefault || row.is_default) {
      await db.productVariant.updateMany({
        where: { product_id: productId, id: { not: variantId } },
        data: { is_default: false },
      });
      row = await db.productVariant.update({
        where: { id: variantId },
        data: { is_default: true },
      });
      await db.product.update({
        where: { id: productId },
        data: {
          base_price: basePrice,
          compare_at_price,
          unit,
        },
      });
      // mirror primary product image from default variant
      if (imageUrls[0]) {
        await db.productImage.deleteMany({ where: { product_id: productId, variant_id: null } });
        await db.productImage.create({
          data: {
            product_id: productId,
            variant_id: null,
            image_url: imageUrls[0],
            is_primary: true,
            sort_order: 0,
          },
        });
      }
    } else {
      // keep parent display price as min active
      const prices = await db.productVariant.findMany({
        where: { product_id: productId, is_active: true },
        select: { base_price: true },
      });
      if (prices.length) {
        await db.product.update({
          where: { id: productId },
          data: { base_price: Math.min(...prices.map((p) => p.base_price)) },
        });
      }
    }

    const stocks = await db.hubStock.findMany({ where: { variant_id: variantId } });
    const imgs = await db.productImage.findMany({
      where: { variant_id: variantId },
      orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
    });

    await audit(admin.id, id ? "update" : "create", "product_variant", variantId, {
      productId,
      name,
      basePrice,
    });
    revalidatePath("/admin/produk");
    revalidatePath("/", "layout");
    return {
      ok: true as const,
      variant: {
        id: row.id,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        base_price: row.base_price,
        compare_at_price: row.compare_at_price,
        is_default: row.is_default,
        is_active: row.is_active,
        sort_order: row.sort_order,
        stock_qty: stocks.reduce((s, hs) => s + hs.stock_qty, 0),
        images: imgs.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
        })),
      },
    };
  } catch (e) {
    console.error("upsertProductVariant", e);
    const msg = e instanceof Error ? e.message : "Gagal simpan varian";
    return { error: msg.includes("Unique") ? "SKU varian bentrok. Coba lagi." : "Gagal simpan varian. Coba lagi." };
  }
}

export async function deleteProductVariant(variantId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: { include: { variants: true } },
      _count: { select: { cart_items: true, order_items: true } },
    },
  });
  if (!variant) return { error: "Varian tidak ditemukan." };
  if (variant.product.variants.length <= 1) {
    return { error: "Produk harus punya minimal 1 varian." };
  }
  if (variant._count.cart_items > 0 || variant._count.order_items > 0) {
    // soft-delete: nonaktifkan saja
    await db.productVariant.update({
      where: { id: variantId },
      data: { is_active: false, is_default: false },
    });
  } else {
    await db.hubStock.deleteMany({ where: { variant_id: variantId } });
    await db.productVariant.delete({ where: { id: variantId } });
  }

  // pastikan ada default
  const still = await db.productVariant.findMany({
    where: { product_id: variant.product_id, is_active: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  if (still.length > 0 && !still.some((v) => v.is_default)) {
    await db.productVariant.update({
      where: { id: still[0].id },
      data: { is_default: true },
    });
    await db.product.update({
      where: { id: variant.product_id },
      data: {
        base_price: still[0].base_price,
        compare_at_price: still[0].compare_at_price,
        unit: still[0].unit,
      },
    });
  }

  await audit(admin.id, "delete", "product_variant", variantId, null);
  revalidatePath("/admin/produk");
  revalidatePath("/admin/inventori");
  return { ok: true };
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

/** Opsi utk form voucher: daftar kategori, produk, dan paket bundling. */
export async function getVoucherFormOptions() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const [categories, products, bundles] = await Promise.all([
    db.category.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { sort_order: "asc" },
    }),
    db.product.findMany({
      where: { status: "active" },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.productBundle.findMany({
      where: { is_active: true },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { categories, products, bundles };
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
