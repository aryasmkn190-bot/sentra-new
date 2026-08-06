import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export { DIRECT_STATUS_LABEL } from "@/lib/direct-status";

export function generateQrToken(): string {
  return randomBytes(9).toString("base64url");
}

export function generateDirectOrderNumber(): string {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `OL-${y}${m}${day}-${rand}`;
}

/** Available = stock - reserved */
export function availableQty(stock_qty: number, reserved_qty: number) {
  return Math.max(stock_qty - reserved_qty, 0);
}

export async function reserveDirectStock(tx: Tx, productId: string, qty: number): Promise<boolean> {
  const affected = await tx.$executeRaw`
    UPDATE direct_products
    SET reserved_qty = reserved_qty + ${qty}, updated_at = NOW()
    WHERE id = ${productId}
      AND is_active = true
      AND stock_qty - reserved_qty >= ${qty}
  `;
  return Number(affected) > 0;
}

export async function releaseDirectStock(tx: Tx, productId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE direct_products
    SET reserved_qty = GREATEST(reserved_qty - ${qty}, 0), updated_at = NOW()
    WHERE id = ${productId}
  `;
}

export async function commitDirectStock(tx: Tx, productId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE direct_products
    SET stock_qty = stock_qty - ${qty},
        reserved_qty = GREATEST(reserved_qty - ${qty}, 0),
        updated_at = NOW()
    WHERE id = ${productId}
  `;
}

/** Paid → order completed (auto selesai, no picking). Idempotent. */
export async function settleDirectPayment(
  paymentId: string,
  gatewayTxnId?: string,
  rawPayload?: unknown
) {
  return db.$transaction(async (tx) => {
    const payment = await tx.directPayment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new Error("Pembayaran order langsung tidak ditemukan");
    if (payment.status === "paid") return payment;
    if (payment.expired_at < new Date()) throw new Error("Pembayaran sudah kedaluwarsa");

    await tx.directPayment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        paid_at: new Date(),
        gateway_transaction_id: gatewayTxnId ?? payment.gateway_transaction_id,
        raw_payload: rawPayload ? JSON.parse(JSON.stringify(rawPayload)) : undefined,
      },
    });

    for (const item of payment.order.items) {
      await commitDirectStock(tx, item.product_id, item.qty);
    }

    await tx.directOrder.update({
      where: { id: payment.order_id },
      data: { status: "completed", paid_at: new Date() },
    });

    return payment;
  });
}

export async function expireDirectIfOverdue(orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.directOrder.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order || order.status !== "pending_payment") return;
    const payment = order.payment;
    if (!payment || payment.status !== "pending" || payment.expired_at > new Date()) return;

    await tx.directPayment.update({ where: { id: payment.id }, data: { status: "expired" } });
    for (const item of order.items) {
      await releaseDirectStock(tx, item.product_id, item.qty);
    }
    await tx.directOrder.update({ where: { id: order.id }, data: { status: "expired" } });
  });
}

export function publicAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://web.locusgroup.site"
  ).replace(/\/$/, "");
}

export function directProductPublicUrl(token: string): string {
  return `${publicAppOrigin()}/order-langsung/p/${token}`;
}
