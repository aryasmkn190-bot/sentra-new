"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveCart } from "@/lib/storefront";
import { reserveStock } from "@/lib/stock";
import { transitionOrder, generateOrderNumber } from "@/lib/orders";
import { settlePayment } from "@/lib/payment";
import { getPaymentUrl } from "@/lib/pakasir";
import { voucherRestrictionError, voucherDiscount, type VoucherLike, type VoucherCartCtx } from "@/lib/vouchers";
import { getCurrentBatchStatus } from "@/lib/batch";

type VoucherCtx = VoucherCartCtx;

/** FR-6.5 — validasi voucher: masa berlaku, kuota total & per-user, min. belanja, segmen, ketentuan. */
export async function validateVoucher(code: string, userId: string, subtotal: number, ctx: VoucherCtx) {
  const voucher = await db.voucher.findUnique({ where: { code: code.toUpperCase() }, include: { usages: true } });
  if (!voucher || !voucher.is_active) return { error: "Kode voucher tidak ditemukan." };
  const now = new Date();
  if (now < voucher.start_at || now > voucher.end_at) return { error: "Voucher sudah tidak berlaku." };
  if (voucher.usages.length >= voucher.quota_total) return { error: "Kuota voucher sudah habis." };
  const myUsage = voucher.usages.filter((u) => u.user_id === userId).length;
  if (myUsage >= voucher.quota_per_user) return { error: "Kamu sudah memakai voucher ini." };
  if (subtotal < voucher.min_order_amount)
    return { error: `Minimal belanja untuk voucher ini Rp${voucher.min_order_amount.toLocaleString("id-ID")}.` };
  if (voucher.target_segment === "new_user") {
    const orderCount = await db.order.count({
      where: { user_id: userId, status: { notIn: ["cancelled"] } },
    });
    if (orderCount > 0) return { error: "Voucher khusus pengguna baru." };
  }
  const restr = voucherRestrictionError(voucher as VoucherLike, { ...ctx, now });
  if (restr) return { error: restr };

  return { voucher, discount: voucherDiscount(voucher as VoucherLike, subtotal, ctx.cartBundleSubtotal) };
}

/** Validasi voucher yang sudah diklaim user (checkout pilih dari daftar klaim). */
export async function validateClaimedVoucher(claimId: string, userId: string, subtotal: number, ctx: VoucherCtx) {
  const claim = await db.claimedVoucher.findUnique({
    where: { id: claimId },
    include: { voucher: { include: { usages: true } } },
  });
  if (!claim || claim.user_id !== userId) return { error: "Voucher tidak ditemukan." };
  if (claim.status !== "claimed") return { error: "Voucher sudah tidak bisa dipakai." };
  const voucher = claim.voucher;
  const now = new Date();
  if (!voucher.is_active || now < voucher.start_at || now > voucher.end_at)
    return { error: "Voucher sudah tidak berlaku." };
  if (voucher.usages.length >= voucher.quota_total) return { error: "Kuota voucher sudah habis." };
  if (subtotal < voucher.min_order_amount)
    return { error: `Minimal belanja untuk voucher ini Rp${voucher.min_order_amount.toLocaleString("id-ID")}.` };
  const restr = voucherRestrictionError(voucher as VoucherLike, { ...ctx, now });
  if (restr) return { error: restr };

  return { voucher, discount: voucherDiscount(voucher as VoucherLike, subtotal, ctx.cartBundleSubtotal), claim };
}

/** Buat order dengan sistem drop point — tanpa ongkir, tanpa biaya layanan, tanpa ETA. */
export async function placeOrder(_prev: unknown, formData: FormData): Promise<{ error?: string } | null> {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/checkout");

  // Validasi Sistem Batch Pembelian (Sentra New)
  const batch = await getCurrentBatchStatus();
  if (batch.isActive && !batch.isOpen) {
    return { error: batch.closedMessage };
  }

  const dropPointId = String(formData.get("drop_point_id") || "");
  const voucherCode = String(formData.get("voucher_code") || "").trim();
  const voucherClaimId = String(formData.get("voucher_id") || "").trim();
  // Catatan untuk penjual (UI: seller_note). Kolom DB tetap delivery_note.
  const sellerNoteRaw =
    String(formData.get("seller_note") || formData.get("delivery_note") || "").trim();
  const deliveryNote = sellerNoteRaw ? sellerNoteRaw.slice(0, 500) : null;
  const substitution = formData.get("substitution_preference") === "replace" ? "replace" : "refund";

  const cart = await getActiveCart();
  if (!cart || cart.items.length === 0) return { error: "Keranjang kosong." };

  // Validasi drop point
  const dropPoint = await db.dropPoint.findFirst({ where: { id: dropPointId, is_active: true } });
  if (!dropPoint) return { error: "Pilih drop point pengambilan." };

  const hub = await db.hub.findUnique({ where: { id: cart.hub_id } });
  if (!hub) return { error: "Hub tidak ditemukan." };

  // Harga efektif per VARIANT produk satuan
  const variantIds = cart.items
    .filter((i) => i.variant_id)
    .map((i) => i.variant_id!);

  const stocks = variantIds.length
    ? await db.hubStock.findMany({
        where: { hub_id: hub.id, variant_id: { in: variantIds } },
      })
    : [];

  const priceOf = (variantId: string, basePrice: number) => {
    const s = stocks.find((x) => x.variant_id === variantId);
    return s?.price_override ?? basePrice;
  };

  const subtotal = cart.items.reduce((sum, i) => {
    if (i.bundle) {
      return sum + i.bundle.price * i.qty;
    }
    if (i.variant) {
      return sum + priceOf(i.variant_id!, i.variant.base_price) * i.qty;
    }
    return sum;
  }, 0);

  // Min order dari zone? Skip — drop point tidak pakai zone. Minimal Rp 0
  if (subtotal <= 0) return { error: "Keranjang kosong." };

  let discount = 0;
  let voucherId: string | null = null;
  let claimIdUsed: string | null = null;

  const cartProductIds = cart.items
    .filter((i) => i.product_id)
    .map((i) => i.product_id!);

  const cartBundleIds = cart.items
    .filter((i) => i.bundle_id)
    .map((i) => i.bundle_id!);

  const cartBundleSubtotal = cart.items
    .filter((i) => i.bundle)
    .reduce((sum, i) => sum + (i.bundle?.price || 0) * i.qty, 0);

  const cartProducts = cartProductIds.length
    ? await db.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { id: true, category_id: true },
      })
    : [];
  const cartCategoryIds = [...new Set(cartProducts.map((p) => p.category_id))];
  const voucherCtx: VoucherCtx = {
    cartProductIds,
    cartCategoryIds,
    cartBundleIds,
    cartBundleSubtotal,
  };

  if (voucherClaimId) {
    const v = await validateClaimedVoucher(voucherClaimId, session.sub, subtotal, voucherCtx);
    if ("error" in v && v.error) return { error: v.error };
    if ("voucher" in v && v.voucher) {
      voucherId = v.voucher.id;
      discount = v.discount;
      claimIdUsed = v.claim.id;
    }
  } else if (voucherCode) {
    const v = await validateVoucher(voucherCode, session.sub, subtotal, voucherCtx);
    if ("error" in v && v.error) return { error: v.error };
    if ("voucher" in v && v.voucher) {
      voucherId = v.voucher.id;
      discount = v.discount;
    }
  }

  // Sentra: tanpa ongkir, tanpa biaya layanan
  const total = Math.max(subtotal - discount, 0);

  let orderId = "";
  let orderNumber = "";
  try {
    await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          order_number: generateOrderNumber(),
          user_id: session.sub,
          hub_id: hub.id,
          drop_point_id: dropPoint.id,
          batch_id: batch.batchId || null,
          batch_name: batch.batchName || null,
          subtotal_amount: subtotal,
          discount_amount: discount,
          delivery_fee: 0,
          service_fee: 0,
          total_amount: total,
          substitution_preference: substitution,
          delivery_note: deliveryNote,
        },
      });
      orderId = order.id;
      orderNumber = order.order_number;

      for (const item of cart.items) {
        if (item.bundle) {
          // Reservasi stok dari tiap produk satuan penyusun paket bundling
          for (const bi of item.bundle.items) {
            let targetVariantId = bi.variant_id;
            if (!targetVariantId) {
              const defVar =
                (await tx.productVariant.findFirst({
                  where: { product_id: bi.product_id, is_default: true },
                })) ||
                (await tx.productVariant.findFirst({
                  where: { product_id: bi.product_id },
                }));
              targetVariantId = defVar?.id || null;
            }

            if (!targetVariantId) {
              throw new Error(`STOK_HABIS:Produk ${bi.product.name} dalam paket tidak ditemukan`);
            }

            const totalNeeded = item.qty * bi.qty;
            const ok = await reserveStock(tx, hub.id, targetVariantId, totalNeeded, order.id);
            if (!ok) {
              throw new Error(`STOK_HABIS:Stok ${bi.product.name} tidak cukup untuk paket ${item.bundle.name}`);
            }
          }

          await tx.orderItem.create({
            data: {
              order_id: order.id,
              bundle_id: item.bundle.id,
              product_name_snapshot: item.bundle.name,
              bundle_name_snapshot: item.bundle.name,
              price_snapshot: item.bundle.price,
              qty_ordered: item.qty,
              subtotal: item.bundle.price * item.qty,
            },
          });
        } else if (item.variant && item.product) {
          const ok = await reserveStock(tx, hub.id, item.variant_id!, item.qty, order.id);
          const label =
            item.variant.name && item.variant.name !== "Standar"
              ? `${item.product.name} (${item.variant.name})`
              : item.product.name;
          if (!ok) throw new Error(`STOK_HABIS:${label}`);
          const price = priceOf(item.variant_id!, item.variant.base_price);
          await tx.orderItem.create({
            data: {
              order_id: order.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              product_name_snapshot: item.product.name,
              variant_name_snapshot: item.variant.name,
              price_snapshot: price,
              qty_ordered: item.qty,
              subtotal: price * item.qty,
            },
          });
        }
      }

      if (voucherId) {
        await tx.voucherUsage.create({
          data: { voucher_id: voucherId, user_id: session.sub, order_id: order.id, discount_applied: discount },
        });
      }
      if (claimIdUsed) {
        await tx.claimedVoucher.update({
          where: { id: claimIdUsed },
          data: { status: "used", order_id: order.id },
        });
      }

      await tx.payment.create({
        data: {
          order_id: order.id,
          gateway: "pakasir",
          amount: total,
          expired_at: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await tx.orderStatusHistory.create({
        data: { order_id: order.id, from_status: "-", to_status: "pending_payment", actor_type: "user", actor_id: session.sub },
      });

      await tx.cart.update({ where: { id: cart.id }, data: { status: "converted" } });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("STOK_HABIS:")) {
      return { error: `Maaf, stok "${msg.split(":")[1]}" baru saja habis. Sesuaikan keranjang kamu, ya.` };
    }
    console.error(e);
    return { error: "Gagal membuat pesanan. Coba lagi." };
  }

  // Redirect to Pakasir payment page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://web.locusgroup.site";
  const returnUrl = `${appUrl}/pesanan/${orderId}`;
  const paymentUrl = getPaymentUrl(orderNumber, total, returnUrl);
  redirect(paymentUrl);
}

/** Simulasi pembayaran sukses — mendukung mock, midtrans, dan pakasir. */
export async function simulatePaymentSuccess(orderId: string) {
  // Mode pakasir: simulasi via API Pakasir
  if (process.env.PAKASIR_SLUG) {
    const { simulatePayment, checkTransaction } = await import("@/lib/pakasir");
    const payment = await db.payment.findFirst({
      where: { order_id: orderId, status: "pending" },
      orderBy: { created_at: "desc" },
      include: { order: true },
    });
    if (!payment) return { error: "Tidak ada pembayaran menunggu." };
    const result = await simulatePayment(payment.order.order_number, payment.amount);
    if (!result.ok) return { error: result.error || "Gagal simulasi" };
    // Settle payment seolah webhook
    try {
      await settlePayment(payment.id, payment.order.order_number, { simulated: true });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Gagal memproses" };
    }
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/pesanan/${orderId}`);
    return { ok: true };
  }

  // Mode mock lama
  const payment = await db.payment.findFirst({
    where: { order_id: orderId, status: "pending" },
    orderBy: { created_at: "desc" },
  });
  if (!payment) return { error: "Tidak ada pembayaran menunggu." };
  try {
    await settlePayment(payment.id, "MOCK-" + Date.now());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal memproses" };
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/pesanan/${orderId}`);
  return { ok: true };
}

/** FR-7.4 — pembatalan oleh pengguna sebelum picking dimulai. */
export async function cancelOrder(orderId: string) {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk dulu." };

  try {
    await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, user_id: session.sub },
        include: { items: true, picking_task: true, payments: { orderBy: { created_at: "desc" }, take: 1 } },
      });
      if (!order) throw new Error("Pesanan tidak ditemukan");
      const pickingStarted = order.picking_task && order.picking_task.status !== "queued";
      if (!["pending_payment", "confirmed"].includes(order.status) || pickingStarted) {
        throw new Error("Pesanan sudah disiapkan dan tidak bisa dibatalkan.");
      }

      const { releaseStock, restoreStock } = await import("@/lib/stock");
      if (order.status === "pending_payment") {
        for (const item of order.items) {
          if (!item.variant_id) continue;
          await releaseStock(tx, order.hub_id, item.variant_id, item.qty_ordered, order.id);
        }
        const p = order.payments[0];
        if (p && p.status === "pending") await tx.payment.update({ where: { id: p.id }, data: { status: "failed" } });
      } else {
        for (const item of order.items) {
          if (!item.variant_id) continue;
          await restoreStock(tx, order.hub_id, item.variant_id, item.qty_ordered, order.id);
        }
        const p = order.payments[0];
        if (p && p.status === "paid") {
          await tx.refund.create({
            data: { payment_id: p.id, order_id: order.id, amount: order.total_amount, type: "full", reason: "Dibatalkan pengguna" },
          });
        }
        if (order.picking_task) await tx.pickingTask.delete({ where: { id: order.picking_task.id } });
      }
      await transitionOrder(tx, order.id, order.status, "cancelled", "user", session.sub, "Dibatalkan pengguna");
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal membatalkan" };
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/pesanan/${orderId}`);
  return { ok: true };
}

/** FR-7.6 — Pesan Lagi: salin seluruh item order lama ke keranjang aktif. */
export async function reorder(orderId: string) {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk dulu." };
  const order = await db.order.findFirst({
    where: { id: orderId, user_id: session.sub },
    include: { items: true },
  });
  if (!order) return { error: "Pesanan tidak ditemukan." };

  let cart = await db.cart.findFirst({ where: { user_id: session.sub, status: "active" } });
  if (!cart) cart = await db.cart.create({ data: { user_id: session.sub, hub_id: order.hub_id } });

  for (const item of order.items) {
    if (!item.variant_id && !item.bundle_id) continue;
    const existing = await db.cartItem.findFirst({
      where: item.variant_id
        ? { cart_id: cart.id, variant_id: item.variant_id }
        : { cart_id: cart.id, bundle_id: item.bundle_id },
    });
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { qty: item.qty_ordered },
      });
    } else {
      await db.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          bundle_id: item.bundle_id,
          qty: item.qty_ordered,
        },
      });
    }
  }
  redirect("/keranjang");
}

/** FR-9.1 — rating pesanan selesai. */
export async function submitReview(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk dulu." };
  const orderId = String(formData.get("order_id"));
  const rating = parseInt(String(formData.get("rating")), 10);
  const comment = String(formData.get("comment") || "") || null;
  if (!rating || rating < 1 || rating > 5) return { error: "Pilih rating 1-5 bintang." };

  const order = await db.order.findFirst({ where: { id: orderId, user_id: session.sub, status: "completed" } });
  if (!order) return { error: "Rating hanya untuk pesanan selesai." };
  await db.review.upsert({
    where: { order_id: orderId },
    update: { rating, comment },
    create: { order_id: orderId, user_id: session.sub, rating, comment },
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/pesanan/${orderId}`);
  return { ok: true };
}