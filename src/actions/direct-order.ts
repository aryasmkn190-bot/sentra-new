"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPaymentUrl } from "@/lib/pakasir";
import {
  availableQty,
  directProductPublicUrl,
  expireDirectIfOverdue,
  generateDirectOrderNumber,
  generateQrToken,
  publicAppOrigin,
  releaseDirectStock,
  reserveDirectStock,
} from "@/lib/direct-order";

async function requireAdmin() {
  const s = await getSession("admin");
  return s;
}

async function requireUser() {
  return getSession("user");
}

// ─── Admin: Produk Langsung ───────────────────────────────────────────

export async function getDirectProducts(page = 1, q = "") {
  const admin = await requireAdmin();
  if (!admin) return null;
  const PER = 20;
  const where: { OR?: { name?: { contains: string; mode: "insensitive" }; sku?: { contains: string; mode: "insensitive" } }[]; is_active?: boolean } = {};
  const query = q.trim();
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }
  const [items, totalItems] = await Promise.all([
    db.directProduct.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Math.max(1, page) - 1) * PER,
      take: PER,
    }),
    db.directProduct.count({ where }),
  ]);
  return {
    items: items.map((p) => ({
      ...p,
      available: availableQty(p.stock_qty, p.reserved_qty),
      qr_url: directProductPublicUrl(p.qr_token),
    })),
    totalItems,
    currentPage: Math.max(1, page),
  };
}

export async function getDirectProduct(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const p = await db.directProduct.findUnique({ where: { id } });
  if (!p) return null;
  return { ...p, available: availableQty(p.stock_qty, p.reserved_qty), qr_url: directProductPublicUrl(p.qr_token) };
}

export async function upsertDirectProduct(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = parseInt(String(formData.get("price") || "0"), 10) || 0;
  const stock_qty = Math.max(0, parseInt(String(formData.get("stock_qty") || "0"), 10) || 0);
  const image_url = String(formData.get("image_url") || "").trim() || null;
  const skuRaw = String(formData.get("sku") || "").trim();
  const sku = skuRaw || null;
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  if (!name) return { error: "Nama produk wajib." };
  if (price <= 0) return { error: "Harga harus > 0." };

  try {
    if (id) {
      const existing = await db.directProduct.findUnique({ where: { id } });
      if (!existing) return { error: "Produk tidak ditemukan." };
      // Jangan turunkan stock di bawah reserved
      if (stock_qty < existing.reserved_qty) {
        return { error: `Stok tidak boleh < reserved (${existing.reserved_qty}).` };
      }
      await db.directProduct.update({
        where: { id },
        data: { name, description, price, stock_qty, image_url, sku, is_active },
      });
    } else {
      await db.directProduct.create({
        data: {
          name,
          description,
          price,
          stock_qty,
          image_url,
          sku,
          is_active,
          qr_token: generateQrToken(),
        },
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("unique")) return { error: "SKU sudah dipakai." };
    console.error("[upsertDirectProduct]", e);
    return { error: "Gagal menyimpan produk." };
  }

  revalidatePath("/admin/order-langsung/produk");
  return { ok: true as const };
}

export async function regenerateDirectQr(productId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  const token = generateQrToken();
  await db.directProduct.update({ where: { id: productId }, data: { qr_token: token } });
  revalidatePath("/admin/order-langsung/produk");
  return { ok: true as const, qr_token: token, qr_url: directProductPublicUrl(token) };
}

export async function deleteDirectProduct(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  const pending = await db.directOrderItem.count({
    where: { product_id: id, order: { status: "pending_payment" } },
  });
  if (pending > 0) return { error: "Masih ada pesanan pending untuk produk ini." };
  try {
    await db.directProduct.delete({ where: { id } });
  } catch {
    // Soft: nonaktifkan jika sudah pernah dipakai
    await db.directProduct.update({ where: { id }, data: { is_active: false } });
    revalidatePath("/admin/order-langsung/produk");
    return { ok: true as const, soft: true };
  }
  revalidatePath("/admin/order-langsung/produk");
  return { ok: true as const };
}

export async function getDirectProductQrDataUrl(productId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  const p = await db.directProduct.findUnique({ where: { id: productId } });
  if (!p) return { error: "Produk tidak ditemukan." };
  const url = directProductPublicUrl(p.qr_token);
  const QRCode = await import("qrcode");
  const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 2 });
  return { ok: true as const, dataUrl, url, name: p.name, price: p.price };
}

// ─── Admin: Pesanan Langsung ──────────────────────────────────────────

export async function getDirectOrders(page = 1, q = "", status = "all") {
  const admin = await requireAdmin();
  if (!admin) return null;
  const PER = 20;
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  const query = q.trim();
  if (query) {
    where.OR = [
      { order_number: { contains: query, mode: "insensitive" } },
      { user: { phone_number: { contains: query } } },
      { user: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  const [items, totalItems] = await Promise.all([
    db.directOrder.findMany({
      where,
      include: {
        user: { select: { name: true, phone_number: true } },
        items: true,
        payment: true,
      },
      orderBy: { created_at: "desc" },
      skip: (Math.max(1, page) - 1) * PER,
      take: PER,
    }),
    db.directOrder.count({ where }),
  ]);
  return { items, totalItems, currentPage: Math.max(1, page) };
}

export async function getDirectOrder(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;
  await expireDirectIfOverdue(id);
  return db.directOrder.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, phone_number: true } },
      items: true,
      payment: true,
    },
  });
}

export async function cancelDirectOrderAdmin(orderId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  try {
    await db.$transaction(async (tx) => {
      const order = await tx.directOrder.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!order) throw new Error("not_found");
      if (order.status !== "pending_payment") throw new Error("not_pending");
      if (order.payment?.status === "pending") {
        await tx.directPayment.update({ where: { id: order.payment.id }, data: { status: "failed" } });
      }
      for (const item of order.items) {
        await releaseDirectStock(tx, item.product_id, item.qty);
      }
      await tx.directOrder.update({ where: { id: order.id }, data: { status: "cancelled" } });
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "not_found") return { error: "Pesanan tidak ditemukan." };
    if (msg === "not_pending") return { error: "Hanya pesanan menunggu bayar yang bisa dibatalkan." };
    return { error: "Gagal membatalkan." };
  }
  revalidatePath("/admin/order-langsung");
  return { ok: true as const };
}

// ─── Storefront ───────────────────────────────────────────────────────

export async function getDirectProductByToken(token: string) {
  const t = token.trim();
  if (!t) return null;
  const p = await db.directProduct.findFirst({
    where: { qr_token: t, is_active: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    image_url: p.image_url,
    available: availableQty(p.stock_qty, p.reserved_qty),
    qr_token: p.qr_token,
  };
}

/** Parse scan result: full URL or raw token */
export async function resolveDirectScan(raw: string) {
  const s = raw.trim();
  if (!s) return { error: "QR kosong." };
  let token = s;
  try {
    if (s.includes("/order-langsung/p/")) {
      const u = new URL(s.startsWith("http") ? s : `https://x${s.startsWith("/") ? "" : "/"}${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("p");
      if (idx >= 0 && parts[idx + 1]) token = parts[idx + 1];
    } else if (s.startsWith("http")) {
      const u = new URL(s);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("p");
      if (idx >= 0 && parts[idx + 1]) token = parts[idx + 1];
      else return { error: "QR bukan produk Order Langsung." };
    }
  } catch {
    // treat as raw token
  }
  const product = await getDirectProductByToken(token);
  if (!product) return { error: "Produk tidak ditemukan atau nonaktif." };
  if (product.available <= 0) return { error: "Stok habis." };
  return { ok: true as const, product };
}

export async function placeDirectOrder(_prev: unknown, formData: FormData) {
  const session = await requireUser();
  const token = String(formData.get("token") || "").trim();
  const qty = Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1);
  if (!session) redirect(`/masuk?next=/order-langsung/p/${encodeURIComponent(token)}`);

  const product = await db.directProduct.findFirst({
    where: { qr_token: token, is_active: true },
  });
  if (!product) return { error: "Produk tidak ditemukan." };
  if (qty > 99) return { error: "Qty maksimal 99." };

  const expiredAt = new Date(Date.now() + 15 * 60 * 1000);
  let orderId = "";
  let orderNumber = "";
  let total = 0;

  try {
    await db.$transaction(async (tx) => {
      const ok = await reserveDirectStock(tx, product.id, qty);
      if (!ok) throw new Error("stok");

      const subtotal = product.price * qty;
      total = subtotal;
      orderNumber = generateDirectOrderNumber();

      const order = await tx.directOrder.create({
        data: {
          order_number: orderNumber,
          user_id: session.sub,
          status: "pending_payment",
          subtotal_amount: subtotal,
          total_amount: total,
          expired_at: expiredAt,
          items: {
            create: {
              product_id: product.id,
              product_name_snapshot: product.name,
              price_snapshot: product.price,
              qty,
              subtotal,
            },
          },
          payment: {
            create: {
              gateway: "pakasir",
              amount: total,
              status: "pending",
              expired_at: expiredAt,
            },
          },
        },
      });
      orderId = order.id;
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "stok") return { error: "Stok tidak cukup." };
    console.error("[placeDirectOrder]", e);
    return { error: "Gagal membuat pesanan." };
  }

  const returnUrl = `${publicAppOrigin()}/order-langsung/selesai/${orderId}`;
  const paymentUrl = getPaymentUrl(orderNumber, total, returnUrl);
  redirect(paymentUrl);
}

export async function getMyDirectOrder(id: string) {
  const session = await requireUser();
  if (!session) return null;
  await expireDirectIfOverdue(id);
  return db.directOrder.findFirst({
    where: { id, user_id: session.sub },
    include: { items: true, payment: true },
  });
}

export async function getPendingDirectOrderCount() {
  const admin = await requireAdmin();
  if (!admin) return 0;
  return db.directOrder.count({ where: { status: "pending_payment" } });
}

/** Laporan khusus Pesanan Langsung — rekap omzet, status count, & top produk terlaris */
export async function getDirectOrderReport(
  period: "today" | "7d" | "30d" | "all" | "custom" = "30d",
  startDateStr?: string,
  endDateStr?: string
) {
  const session = await getSession("admin");
  if (!session) return null;

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
    db.directOrder.count({ where: whereDate }),
    db.directOrder.aggregate({
      where: { ...whereDate, status: "completed" },
      _sum: { total_amount: true },
      _count: { _all: true },
    }),
    db.directOrder.groupBy({
      by: ["status"],
      where: whereDate,
      _count: { _all: true },
    }),
    db.directOrderItem.groupBy({
      by: ["product_id", "product_name_snapshot"],
      where: { order: { ...whereDate, status: "completed" } },
      _sum: { qty: true, subtotal: true },
      _count: { _all: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    db.directOrder.findMany({
      where: whereDate,
      include: {
        user: { select: { name: true, phone_number: true } },
        items: true,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  const totalOmzet = completedAgg._sum.total_amount || 0;
  const completedCount = completedAgg._count._all || 0;

  const counts: Record<string, number> = {
    pending_payment: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  };
  statusCounts.forEach((s) => {
    counts[s.status] = s._count._all;
  });

  const topProducts = topProductsRaw.map((p) => ({
    productId: p.product_id,
    name: p.product_name_snapshot,
    totalQty: p._sum.qty || 0,
    totalRevenue: p._sum.subtotal || 0,
    orderCount: p._count._all,
  }));

  return {
    period,
    summary: {
      totalOrders,
      completedCount,
      totalOmzet,
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
      item_name: o.items[0]?.product_name_snapshot || "-",
      qty: o.items[0]?.qty || 0,
      price: o.items[0]?.price_snapshot || 0,
    })),
  };
}

