import { STATUS_LABEL } from "@/lib/orders";

const TONE: Record<string, string> = {
  pending_payment: "bg-kilat/30 text-tinta",
  confirmed: "bg-blue-100 text-blue-800",
  picking: "bg-blue-100 text-blue-800",
  packed: "bg-indigo-100 text-indigo-800",
  on_delivery: "bg-amber-100 text-amber-800",
  arrived: "bg-amber-100 text-amber-800",
  completed: "bg-hijau-muda text-hijau-tua",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
