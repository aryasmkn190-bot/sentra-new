"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrder } from "@/actions/admin";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusOverride, ProcessRefundButton } from "./[id]/AdminOrderActions";

type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

type Props = {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export function OrderDetailModal({ open, orderId, onClose, onChanged }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const close = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const data = await getOrder(id);
    setOrder(data as OrderDetail | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && orderId && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      load(orderId);
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
      setOrder(null);
    }
  }, [open, orderId, load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [close]);

  // Refresh detail after status override / refund while modal open
  useEffect(() => {
    if (!open || !orderId) return;
    const onFocus = () => load(orderId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, orderId, load]);

  if (!open) return null;

  const addr = (order?.address_snapshot ?? {}) as Record<string, string>;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-800 truncate">
              {order?.order_number ?? "Detail Pesanan"}
            </h2>
            {order && (
              <div className="mt-1">
                <StatusBadge status={order.status} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[75dvh] overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !order ? (
            <p className="py-8 text-center text-sm text-slate-400">Pesanan tidak ditemukan.</p>
          ) : (
            <>
              <section className="rounded-xl border border-black/5 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-extrabold text-slate-800">Override status</h3>
                <StatusOverride
                  orderId={order.id}
                  current={order.status}
                  onDone={() => {
                    load(order.id);
                    onChanged();
                  }}
                />
                <p className="mt-1 text-[11px] text-slate-500">Perubahan masuk audit log & riwayat status.</p>
              </section>

              <section className="rounded-xl border border-black/5 p-4 text-sm">
                <h3 className="mb-2 text-sm font-extrabold text-slate-800">Pelanggan & pengiriman</h3>
                <p className="font-semibold text-slate-800">
                  {order.user.name || "Pelanggan"} ({order.user.phone_number})
                </p>
                {order.drop_point_id ? (
                  <p className="text-xs text-slate-500">Drop Point: {order.dropPoint?.name || "Drop Point"}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-600">
                      {addr.recipient_name} · {addr.recipient_phone}
                    </p>
                    <p className="text-xs text-slate-500">{addr.full_address}</p>
                  </>
                )}
                <p className="mt-1.5 border-t border-black/5 pt-1.5 text-xs text-slate-500">
                  Hub: {order.hub?.code ?? "—"} · Picker: {order.picking_task?.picker?.name ?? "—"} · Driver:{" "}
                  {order.delivery_task?.driver?.name ?? "—"}
                </p>
              </section>

              {order.delivery_note && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <h3 className="mb-1 text-sm font-extrabold text-amber-900">Catatan untuk penjual</h3>
                  <p className="whitespace-pre-wrap text-amber-950/90">{order.delivery_note}</p>
                </section>
              )}

              <section className="rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                  Item pesanan
                </div>
                {order.items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{i.product_name_snapshot}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Varian:{" "}
                        <span className="font-bold text-slate-700">
                          {i.variant_name_snapshot?.trim() || "—"}
                        </span>
                        {" · "}× {i.qty_ordered}
                        {i.status === "oos" && (
                          <span className="ml-1 font-bold text-merah">(habis)</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-slate-700">
                      {rupiah(i.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between p-3 text-sm font-extrabold text-slate-800">
                  <span>Total</span>
                  <span className="tabular-nums">{rupiah(order.total_amount)}</span>
                </div>
              </section>

              {order.refunds.length > 0 && (
                <section className="rounded-xl border border-black/5 p-4">
                  <h3 className="mb-2 text-sm font-extrabold text-slate-800">Refund</h3>
                  {order.refunds.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-b border-black/5 py-2 text-sm last:border-0"
                    >
                      <span className="text-slate-700">
                        {rupiah(r.amount)} · {r.reason} · <b>{r.status}</b>
                      </span>
                      {r.status === "pending" && (
                        <ProcessRefundButton
                          refundId={r.id}
                          onDone={() => {
                            load(order.id);
                            onChanged();
                          }}
                        />
                      )}
                    </div>
                  ))}
                </section>
              )}

              <section className="rounded-xl border border-black/5 p-4">
                <h3 className="mb-2 text-sm font-extrabold text-slate-800">Riwayat status</h3>
                <ol className="space-y-1 text-xs">
                  {order.status_histories.map((h) => (
                    <li key={h.id} className="flex gap-2 text-slate-600">
                      <span className="tabular-nums text-slate-400">
                        {new Date(h.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </span>
                      <span>
                        {h.from_status} → <b>{h.to_status}</b> ({h.actor_type})
                        {h.note ? ` — ${h.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
        <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 md:hidden" />
      </div>
    </dialog>
  );
}
