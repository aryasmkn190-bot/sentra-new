import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rupiah } from "@/lib/money";
import { ORDER_FLOW, STATUS_LABEL } from "@/lib/orders";
import { expireIfOverdue } from "@/lib/payment";
import { simulatePaymentSuccess, cancelOrder, reorder } from "@/actions/checkout";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { ReviewForm } from "./ReviewForm";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession("user");
  if (!session) redirect(`/masuk?next=/pesanan/${id}`);

  await expireIfOverdue(id); // FR-6.6 lazy check

  const order = await db.order.findFirst({
    where: { id, user_id: session.sub },
    include: {
      items: true,
      payments: { orderBy: { created_at: "desc" } },
      status_histories: { orderBy: { created_at: "asc" } },
      delivery_task: { include: { driver: true } },
      picking_task: true,
      review: true,
      refunds: true,
      dropPoint: true,
    },
  });
  if (!order) notFound();

  const payment = order.payments[0];
  const addr = (order.address_snapshot ?? {}) as Record<string, string>;
  const activeIdx = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const canCancel =
    ["pending_payment", "confirmed"].includes(order.status) &&
    (!order.picking_task || order.picking_task.status === "queued");
  const mockMode = process.env.PAYMENT_MODE !== "midtrans";
  const driver = order.delivery_task?.driver;

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold tabular-nums">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Pembayaran menunggu */}
      {order.status === "pending_payment" && payment?.status === "pending" && (
        <section className="kartu space-y-3 border-2 border-kilat p-4">
          <p className="text-sm font-extrabold">Selesaikan pembayaran</p>
          <p className="text-xs text-tinta/60">
            Total <span className="font-extrabold text-tinta">{rupiah(payment.amount)}</span> — batas waktu{" "}
            {new Date(payment.expired_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB.
            Stok kamu sudah diamankan sampai batas waktu itu.
          </p>
          {mockMode ? (
            <ActionButton action={simulatePaymentSuccess.bind(null, order.id)}>
              Simulasi bayar (mode dev)
            </ActionButton>
          ) : (
            <p className="rounded-xl bg-hijau-muda p-3 text-xs">
              Selesaikan pembayaran melalui Pakasir (QRIS / Virtual Account). Status akan otomatis terbarui setelah pembayaran diterima.
            </p>
          )}
        </section>
      )}

      {/* Timeline status (FR-7.2) */}
      {!["cancelled", "refunded"].includes(order.status) && (
        <section className="kartu p-4">
          <ol className="space-y-0">
            {ORDER_FLOW.map((s, i) => {
              const done = i <= activeIdx;
              const history = order.status_histories.find((h) => h.to_status === s);
              return (
                <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < ORDER_FLOW.length - 1 && (
                    <span className={`absolute left-[9px] top-5 h-full w-0.5 ${i < activeIdx ? "bg-hijau" : "bg-black/10"}`} />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${
                      done ? "border-hijau bg-hijau" : "border-black/15 bg-white"
                    }`}
                  >
                    {done && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">✓</span>}
                  </span>
                  <div>
                    <p className={`text-sm ${done ? "font-extrabold" : "font-semibold text-tinta/40"}`}>{STATUS_LABEL[s]}</p>
                    {history && (
                      <p className="text-[11px] text-tinta/50">
                        {new Date(history.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {order.estimated_delivery_at && (
          <p className="mt-3 rounded-xl bg-kilat/25 px-3 py-2 text-xs font-bold">
            ⚡ Estimasi tiba{" "}
            {new Date(order.estimated_delivery_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
          </p>
          )}
        </section>
      )}

      {order.status === "cancelled" && (
        <p className="kartu border-l-4 border-merah p-4 text-sm">
          Pesanan dibatalkan{order.cancelled_reason ? ` — ${order.cancelled_reason}` : ""}.
        </p>
      )}

      {/* Info driver (FR-7.2) */}
      {driver && ["on_delivery", "arrived"].includes(order.status) && (
        <section className="kartu flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hijau-muda text-xl" aria-hidden>🛵</span>
          <div>
            <p className="text-sm font-extrabold">{driver.name}</p>
            <p className="text-xs text-tinta/60">
              {driver.vehicle_plate} · {driver.phone.slice(0, 4)}****{driver.phone.slice(-3)}
            </p>
          </div>
        </section>
      )}

      {/* Item */}
      <section className="kartu divide-y divide-black/5">
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-semibold">{i.product_name_snapshot}</p>
              <p className="text-xs text-tinta/50">
                {i.qty_ordered} × {rupiah(i.price_snapshot)}
                {i.status === "oos" && <span className="ml-1 font-bold text-merah">· habis, akan direfund</span>}
              </p>
            </div>
            <span className="font-extrabold tabular-nums">{rupiah(i.subtotal)}</span>
          </div>
        ))}
      </section>

      {/* Ringkasan */}
      <section className="kartu space-y-1 p-4 text-sm">
        <div className="flex justify-between"><span className="text-tinta/60">Subtotal</span><span className="tabular-nums">{rupiah(order.subtotal_amount)}</span></div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-hijau"><span>Diskon voucher</span><span className="tabular-nums">−{rupiah(order.discount_amount)}</span></div>
        )}
        <div className="flex justify-between"><span className="text-tinta/60">Biaya layanan</span><span className="tabular-nums">{rupiah(order.service_fee)}</span></div>
        <div className="flex justify-between border-t border-black/5 pt-2 text-base font-extrabold"><span>Total</span><span className="tabular-nums">{rupiah(order.total_amount)}</span></div>
        {order.refunds.map((r) => (
          <p key={r.id} className="rounded-xl bg-hijau-muda px-3 py-2 text-xs">
            Refund {r.type === "full" ? "penuh" : "parsial"} {rupiah(r.amount)} — {r.status === "processed" ? "sudah diproses" : "sedang diproses"}
          </p>
        ))}
      </section>

      {/* Drop point / Alamat */}
      <section className="kartu p-4 text-sm">
        <p className="text-xs font-extrabold uppercase text-hijau">Pengambilan di</p>
        {order.drop_point_id ? (
          <p className="font-semibold">Drop Point: {addr.full_address || "Drop Point"}</p>
        ) : addr.recipient_name ? (
          <>
            <p className="font-semibold">{addr.recipient_name} · {addr.recipient_phone}</p>
            <p className="text-xs text-tinta/60">{addr.full_address}</p>
          </>
        ) : (
          <p className="text-xs text-tinta/60">Informasi pengambilan tidak tersedia</p>
        )}
        {order.delivery_note && <p className="mt-1 text-xs italic text-tinta/60">"{order.delivery_note}"</p>}
      </section>

      {/* Aksi */}
      <div className="space-y-2">
        {order.status === "completed" && !order.review && (
          <section className="kartu p-4">
            <ReviewForm orderId={order.id} />
          </section>
        )}
        {order.review && (
          <p className="kartu p-4 text-sm">
            Penilaianmu: {"⭐".repeat(order.review.rating)}
            {order.review.comment && <span className="block text-xs text-tinta/60">"{order.review.comment}"</span>}
          </p>
        )}
        {["completed", "cancelled"].includes(order.status) && (
          <ActionButton action={reorder.bind(null, order.id)} className="btn-garis">
            🔁 Pesan lagi
          </ActionButton>
        )}
        {canCancel && (
          <ActionButton
            action={cancelOrder.bind(null, order.id)}
            confirmText="Yakin membatalkan pesanan ini?"
            className="btn-garis !border-merah !text-merah hover:!bg-red-50"
          >
            Batalkan pesanan
          </ActionButton>
        )}
        <p className="text-center text-[11px] text-tinta/50">
          Ada kendala? Hubungi CS via WhatsApp di halaman Bantuan.
        </p>
      </div>
    </div>
  );
}
