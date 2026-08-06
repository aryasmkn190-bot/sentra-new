import { Prisma } from "@prisma/client";
import { applySalesOnOrderCompleted } from "@/lib/product-stats";

type Tx = Prisma.TransactionClient;

export const ORDER_FLOW = [
  "pending_payment",
  "confirmed",
  "picking",
  "packed",
  "on_delivery",
  "arrived",
  "completed",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  confirmed: "Dikonfirmasi",
  picking: "Sedang Disiapkan",
  packed: "Siap Diantar",
  on_delivery: "Dalam Pengantaran",
  arrived: "Tiba di Tujuan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

/** 4 kategori list pesanan user (tab di /pesanan). */
export const ORDER_LIST_TABS = [
  {
    key: "menunggu",
    label: "Menunggu Bayar",
    shortLabel: "Bayar",
    statuses: ["pending_payment"] as const,
  },
  {
    key: "diproses",
    label: "Diproses",
    shortLabel: "Proses",
    statuses: ["confirmed", "picking", "packed", "on_delivery", "arrived"] as const,
  },
  {
    key: "selesai",
    label: "Selesai",
    shortLabel: "Selesai",
    statuses: ["completed"] as const,
  },
  {
    key: "dibatalkan",
    label: "Dibatalkan",
    shortLabel: "Batal",
    statuses: ["cancelled", "refunded"] as const,
  },
] as const;

export type OrderListTabKey = (typeof ORDER_LIST_TABS)[number]["key"];

export function isOrderListTabKey(v: string | null | undefined): v is OrderListTabKey {
  return !!v && ORDER_LIST_TABS.some((t) => t.key === v);
}

export function statusesForOrderTab(tab: OrderListTabKey): string[] {
  const found = ORDER_LIST_TABS.find((t) => t.key === tab);
  return found ? [...found.statuses] : [...ORDER_LIST_TABS[0].statuses];
}

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
