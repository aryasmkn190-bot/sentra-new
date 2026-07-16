import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusOverride, ProcessRefundButton } from "./AdminOrderActions";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true, items: true, payments: true, refunds: true,
      status_histories: { orderBy: { created_at: "asc" } },
      picking_task: { include: { picker: true } },
      delivery_task: { include: { driver: true } },
      dropPoint: true,
    },
  });
  if (!order) notFound();
  const addr = (order.address_snapshot ?? {}) as Record<string, string>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tabular-nums">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>

      <section className="kartu p-4">
        <h2 className="mb-2 text-sm font-extrabold">Override status (edge case — FR-11.3)</h2>
        <StatusOverride orderId={order.id} current={order.status} />
        <p className="mt-1 text-[11px] text-tinta/50">Semua perubahan tercatat di audit log & riwayat status.</p>
      </section>

      <section className="kartu p-4 text-sm">
        <h2 className="mb-2 text-sm font-extrabold">Pelanggan & pengiriman</h2>
        <p className="font-semibold">{order.user.name || "Pelanggan"} ({order.user.phone_number})</p>
        {order.drop_point_id ? (
          <p className="text-xs text-tinta/60">Drop Point: {order.dropPoint?.name || "Drop Point"}</p>
        ) : (
          <>
            <p className="text-xs">{addr.recipient_name} · {addr.recipient_phone}</p>
            <p className="text-xs text-tinta/60">{addr.full_address}</p>
          </>
        )}
        <p className="mt-1.5 text-xs border-t border-black/5 pt-1.5 text-slate-500">
          Picker: {order.picking_task?.picker?.name ?? "—"} · Driver: {order.delivery_task?.driver?.name ?? "—"}
        </p>
      </section>

      <section className="kartu divide-y divide-black/5">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between p-3 text-sm">
            <span>
              {i.product_name_snapshot} × {i.qty_ordered}
              {i.status === "oos" && <span className="ml-1 text-xs font-bold text-merah">(habis)</span>}
            </span>
            <span className="tabular-nums">{rupiah(i.subtotal)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 text-sm font-extrabold">
          <span>Total</span><span className="tabular-nums">{rupiah(order.total_amount)}</span>
        </div>
      </section>

      {order.refunds.length > 0 && (
        <section className="kartu p-4">
          <h2 className="mb-2 text-sm font-extrabold">Refund</h2>
          {order.refunds.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-black/5 py-2 text-sm last:border-0">
              <span>{rupiah(r.amount)} · {r.reason} · <b>{r.status}</b></span>
              {r.status === "pending" && <ProcessRefundButton refundId={r.id} />}
            </div>
          ))}
        </section>
      )}

      <section className="kartu p-4">
        <h2 className="mb-2 text-sm font-extrabold">Riwayat status (dasar SLA)</h2>
        <ol className="space-y-1 text-xs">
          {order.status_histories.map((h) => (
            <li key={h.id} className="flex gap-2">
              <span className="tabular-nums text-tinta/50">
                {new Date(h.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span>{h.from_status} → <b>{h.to_status}</b> ({h.actor_type}){h.note ? ` — ${h.note}` : ""}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
