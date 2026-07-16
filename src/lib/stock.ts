import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Reservasi stok anti-oversell (PRD §10.3.5 #2, NFR Konsistensi Stok).
 * Stok tersedia = stock_qty - reserved_qty. UPDATE bersyarat memastikan
 * atomisitas di level baris; jika 0 baris terpengaruh, stok tidak cukup.
 */
export async function reserveStock(
  tx: Tx,
  hubId: string,
  productId: string,
  qty: number,
  orderId: string
): Promise<boolean> {
  const affected = await tx.$executeRaw`
    UPDATE hub_stocks
    SET reserved_qty = reserved_qty + ${qty}, updated_at = NOW()
    WHERE hub_id = ${hubId} AND product_id = ${productId}
      AND stock_qty - reserved_qty >= ${qty}
  `;
  if (affected === 0) return false;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_product_id: { hub_id: hubId, product_id: productId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "reserve", qty, reference_type: "order", reference_id: orderId },
    });
  }
  return true;
}

/** Lepas reservasi (pembayaran gagal/timeout/batal sebelum bayar). */
export async function releaseStock(tx: Tx, hubId: string, productId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET reserved_qty = GREATEST(reserved_qty - ${qty}, 0), updated_at = NOW()
    WHERE hub_id = ${hubId} AND product_id = ${productId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_product_id: { hub_id: hubId, product_id: productId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "release", qty, reference_type: "order", reference_id: orderId },
    });
  }
}

/** Pembayaran sukses: potong stok fisik + lepas reservasi (movement out+release). */
export async function commitStock(tx: Tx, hubId: string, productId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET stock_qty = stock_qty - ${qty},
        reserved_qty = GREATEST(reserved_qty - ${qty}, 0),
        updated_at = NOW()
    WHERE hub_id = ${hubId} AND product_id = ${productId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_product_id: { hub_id: hubId, product_id: productId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "out", qty, reference_type: "order", reference_id: orderId },
    });
  }
}

/** Kembalikan stok fisik (pembatalan setelah bayar, sebelum picking). */
export async function restoreStock(tx: Tx, hubId: string, productId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET stock_qty = stock_qty + ${qty}, updated_at = NOW()
    WHERE hub_id = ${hubId} AND product_id = ${productId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_product_id: { hub_id: hubId, product_id: productId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "in", qty, reference_type: "order", reference_id: orderId, note: "pembatalan order" },
    });
  }
}
