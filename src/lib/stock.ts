import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Reservasi stok anti-oversell di level VARIANT.
 * Stok tersedia = stock_qty - reserved_qty.
 */
export async function reserveStock(
  tx: Tx,
  hubId: string,
  variantId: string,
  qty: number,
  orderId: string
): Promise<boolean> {
  const affected = await tx.$executeRaw`
    UPDATE hub_stocks
    SET reserved_qty = reserved_qty + ${qty}, updated_at = NOW()
    WHERE hub_id = ${hubId} AND variant_id = ${variantId}
      AND stock_qty - reserved_qty >= ${qty}
  `;
  if (affected === 0) return false;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_variant_id: { hub_id: hubId, variant_id: variantId } },
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
export async function releaseStock(tx: Tx, hubId: string, variantId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET reserved_qty = GREATEST(reserved_qty - ${qty}, 0), updated_at = NOW()
    WHERE hub_id = ${hubId} AND variant_id = ${variantId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_variant_id: { hub_id: hubId, variant_id: variantId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "release", qty, reference_type: "order", reference_id: orderId },
    });
  }
}

/** Pembayaran sukses: potong stok fisik + lepas reservasi. */
export async function commitStock(tx: Tx, hubId: string, variantId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET stock_qty = stock_qty - ${qty},
        reserved_qty = GREATEST(reserved_qty - ${qty}, 0),
        updated_at = NOW()
    WHERE hub_id = ${hubId} AND variant_id = ${variantId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_variant_id: { hub_id: hubId, variant_id: variantId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: { hub_stock_id: hs.id, type: "out", qty, reference_type: "order", reference_id: orderId },
    });
  }
}

/** Kembalikan stok fisik (pembatalan setelah bayar, sebelum picking). */
export async function restoreStock(tx: Tx, hubId: string, variantId: string, qty: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE hub_stocks
    SET stock_qty = stock_qty + ${qty}, updated_at = NOW()
    WHERE hub_id = ${hubId} AND variant_id = ${variantId}
  `;
  const hs = await tx.hubStock.findUnique({
    where: { hub_id_variant_id: { hub_id: hubId, variant_id: variantId } },
    select: { id: true },
  });
  if (hs) {
    await tx.stockMovement.create({
      data: {
        hub_stock_id: hs.id,
        type: "in",
        qty,
        reference_type: "order",
        reference_id: orderId,
        note: "pembatalan order",
      },
    });
  }
}
