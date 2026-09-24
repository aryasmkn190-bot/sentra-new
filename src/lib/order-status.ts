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
