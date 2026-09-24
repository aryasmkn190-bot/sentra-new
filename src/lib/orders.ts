import { Prisma } from "@prisma/client";
import { applySalesOnOrderCompleted } from "@/lib/product-stats";
import {
  ORDER_FLOW,
  STATUS_LABEL,
  ORDER_LIST_TABS,
  type OrderListTabKey,
  isOrderListTabKey,
  statusesForOrderTab,
} from "./order-status";

export {
  ORDER_FLOW,
  STATUS_LABEL,
  ORDER_LIST_TABS,
  type OrderListTabKey,
  isOrderListTabKey,
  statusesForOrderTab,
};

type Tx = Prisma.TransactionClient;

/** Transisi status + tulis riwayat (PRD §10.3.5 #7 — dasar perhitungan SLA). */
export async function transitionOrder(
  tx: Tx,
  orderId: string,
  fromStatus: string,
  toStatus: string,
  actorType: "system" | "user" | "admin" | "partner",
  actorId?: string,
  note?: string
) {
  await tx.order.update({
    where: { id: orderId },
    data: {
      status: toStatus,
      ...(toStatus === "completed" ? { completed_at: new Date() } : {}),
      ...(toStatus === "cancelled" && note ? { cancelled_reason: note } : {}),
    },
  });
  await tx.orderStatusHistory.create({
    data: {
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      actor_type: actorType,
      actor_id: actorId ?? null,
      note: note ?? null,
    },
  });

  // Rekap penjualan produk saat order selesai (sold_count).
  if (toStatus === "completed" && fromStatus !== "completed") {
    await applySalesOnOrderCompleted(orderId, tx);
  }
}

export function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KM-${ymd}-${rand}`;
}
