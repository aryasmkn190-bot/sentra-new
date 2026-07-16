import { createHash } from "crypto";
import { db } from "./db";
import { commitStock, releaseStock } from "./stock";
import { transitionOrder } from "./orders";

/**
 * FR-6.4/6.6 — Pembayaran via gateway.
 * PAYMENT_MODE=mock     → tombol "Simulasi bayar" (dev/staging).
 * PAYMENT_MODE=midtrans → webhook /api/payments/webhook memverifikasi
 *                         signature SHA-512 Midtrans lalu memanggil settlePayment.
 */

export function verifyMidtransSignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const expected = createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest("hex");
  return expected === body.signature_key;
}

/** Idempotent: aman dipanggil berulang dari webhook (retry gateway). */
export async function settlePayment(paymentId: string, gatewayTxnId?: string, rawPayload?: unknown) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new Error("Pembayaran tidak ditemukan");
    if (payment.status === "paid") return payment; // idempotent

    if (payment.expired_at < new Date()) {
      throw new Error("Pembayaran sudah kedaluwarsa");
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        paid_at: new Date(),
        gateway_transaction_id: gatewayTxnId ?? payment.gateway_transaction_id,
        raw_payload: rawPayload ? JSON.parse(JSON.stringify(rawPayload)) : undefined,
      },
    });

    const order = payment.order;
    for (const item of order.items) {
      await commitStock(tx, order.hub_id, item.product_id, item.qty_ordered, order.id);
    }
    await transitionOrder(tx, order.id, order.status, "confirmed", "system", undefined, "Pembayaran diterima");
    await tx.pickingTask.create({
      data: { order_id: order.id, hub_id: order.hub_id },
    });
    return payment;
  });
}

/** FR-6.6 — batalkan order yang pembayarannya lewat batas waktu (lazy check). */
export async function expireIfOverdue(orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { created_at: "desc" }, take: 1 } },
    });
    if (!order || order.status !== "pending_payment") return;
    const payment = order.payments[0];
    if (!payment || payment.status !== "pending" || payment.expired_at > new Date()) return;

    await tx.payment.update({ where: { id: payment.id }, data: { status: "expired" } });
    for (const item of order.items) {
      await releaseStock(tx, order.hub_id, item.product_id, item.qty_ordered, order.id);
    }
    await transitionOrder(tx, order.id, "pending_payment", "cancelled", "system", undefined, "Pembayaran melewati batas waktu (15 menit)");
  });
}
