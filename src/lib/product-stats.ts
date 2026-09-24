import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof db;

/**
 * Rekap qty terjual untuk 1 produk dari order completed.
 * qty = qty_fulfilled jika > 0, else qty_ordered (untuk item fulfilled).
 * Item oos/refunded tidak dihitung.
 */
export async function recomputeProductSoldCount(productId: string, client: Tx = db) {
  const rows = await client.orderItem.findMany({
    where: {
      product_id: productId,
      status: { in: ["fulfilled", "substituted"] },
      order: { status: "completed" },
    },
    select: { qty_fulfilled: true, qty_ordered: true },
  });

  const sold = rows.reduce((sum, r) => {
    const q = r.qty_fulfilled > 0 ? r.qty_fulfilled : r.qty_ordered;
    return sum + Math.max(0, q);
  }, 0);

  await client.product.update({
    where: { id: productId },
    data: { sold_count: sold },
  });
  return sold;
}

/** Rekap rata-rata rating + jumlah ulasan visible untuk 1 produk. */
export async function recomputeProductRating(productId: string, client: Tx = db) {
  const agg = await client.productReview.aggregate({
    where: { product_id: productId, is_visible: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const rating_avg = agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0;
  const rating_count = agg._count._all;

  await client.product.update({
    where: { id: productId },
    data: { rating_avg, rating_count },
  });
  return { rating_avg, rating_count };
}

/**
 * Saat order menjadi completed: naikkan sold_count per item.
 * Idempotent-ish: recompute penuh per product_id unik di order.
 */
export async function applySalesOnOrderCompleted(orderId: string, client: Tx = db) {
  const items = await client.orderItem.findMany({
    where: {
      order_id: orderId,
      status: { in: ["fulfilled", "substituted"] },
    },
    select: { product_id: true },
  });

  const productIds = Array.from(
    new Set(items.map((i) => i.product_id).filter((id): id is string => Boolean(id)))
  );
  for (const productId of productIds) {
    await recomputeProductSoldCount(productId, client);
  }
  return productIds.length;
}

/** Backfill sold_count semua produk (admin/maintenance). */
export async function backfillAllSoldCounts(client: Tx = db) {
  const products = await client.product.findMany({ select: { id: true } });
  for (const p of products) {
    await recomputeProductSoldCount(p.id, client);
  }
  return products.length;
}

/** Backfill rating_avg/rating_count semua produk. */
export async function backfillAllRatings(client: Tx = db) {
  const products = await client.product.findMany({ select: { id: true } });
  for (const p of products) {
    await recomputeProductRating(p.id, client);
  }
  return products.length;
}

/**
 * Skor ranking Penawaran Terbaik:
 * - sold_count (bobot utama)
 * - rating_avg * log(1 + rating_count) (rating tinggi + cukup sample)
 * - tie-break: rating_avg, sold_count, created_at
 */
export function bestOfferScore(p: {
  sold_count: number;
  rating_avg: number;
  rating_count: number;
}) {
  const sold = Math.max(0, p.sold_count || 0);
  const avg = Math.max(0, p.rating_avg || 0);
  const count = Math.max(0, p.rating_count || 0);
  // rating term: 0–5 * log1p(count) → prefer many high ratings
  const ratingTerm = avg * Math.log1p(count);
  return sold * 10 + ratingTerm * 20;
}

export function formatSoldCount(n: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}rb+`;
  }
  return String(n);
}

export function formatRating(avg: number, count: number): string {
  if (!count || count <= 0) return "Belum ada rating";
  return `${avg.toFixed(1)} · ${count} ulasan`;
}
