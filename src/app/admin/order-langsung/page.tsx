"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { cancelDirectOrderAdmin, getDirectOrder, getDirectOrders } from "@/actions/direct-order";
import { DIRECT_STATUS_LABEL } from "@/lib/direct-status";
import { rupiah } from "@/lib/money";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string | Date;
  paid_at: string | Date | null;
  user: { name: string | null; phone_number: string };
  items: { product_name_snapshot: string; qty: number; subtotal: number }[];
  payment: { status: string } | null;
};

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending_payment", label: "Menunggu bayar" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Batal" },
  { key: "expired", label: "Kedaluwarsa" },
] as const;

export default function AdminDirectOrdersPage() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getDirectOrder>> | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDirectOrders(1, q, status);
    setItems((res?.items as OrderRow[]) ?? []);
    setLoading(false);
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = (id: string) => {
    start(async () => {
      const d = await getDirectOrder(id);
      setDetail(d);
    });
  };

  const cancel = (id: string) => {
    if (!confirm("Batalkan pesanan pending ini?")) return;
    start(async () => {
      const res = await cancelDirectOrderAdmin(id);
      if (res && "error" in res && res.error) {
        alert(res.error);
        return;
      }
      setDetail(null);
      await load();
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Pesanan Order Langsung</h1>
        <p className="text-xs text-slate-500">
          Setelah bayar otomatis <b>Selesai</b> — tanpa picking/kirim. Terpisah dari menu Pesanan online.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status === f.key ? "bg-[#A00000] text-white" : "bg-white text-slate-600 ring-1 ring-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="input max-w-sm"
          placeholder="Cari nomor OL- / telepon / nama…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn-garis !px-4 !py-2 !text-sm">
          Cari
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Nomor</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Item</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Memuat…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Belum ada pesanan langsung.
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-mono text-xs font-bold">{o.order_number}</td>
                  <td className="p-3">
                    <p className="font-semibold">{o.user.name || "Pelanggan"}</p>
                    <p className="text-[11px] text-slate-400">{o.user.phone_number}</p>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {o.items.map((i) => `${i.product_name_snapshot} ×${i.qty}`).join(", ")}
                  </td>
                  <td className="p-3 font-semibold tabular-nums">{rupiah(o.total_amount)}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        o.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : o.status === "pending_payment"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {DIRECT_STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => openDetail(o.id)} className="btn-garis !px-2.5 !py-1 !text-xs">
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" onClick={() => setDetail(null)}>
          <div
            className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-extrabold">{detail.order_number}</p>
                <p className="text-xs text-slate-500">
                  {DIRECT_STATUS_LABEL[detail.status] || detail.status}
                </p>
              </div>
              <button type="button" className="text-slate-400" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{detail.user.name || "Pelanggan"}</p>
              <p className="text-xs text-slate-500">{detail.user.phone_number}</p>
            </div>
            <div className="divide-y divide-black/5 rounded-xl border border-black/5">
              {detail.items.map((i) => (
                <div key={i.id} className="flex justify-between p-3 text-sm">
                  <span>
                    {i.product_name_snapshot} × {i.qty}
                  </span>
                  <span className="tabular-nums font-semibold">{rupiah(i.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between p-3 text-sm font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">{rupiah(detail.total_amount)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Dibuat {new Date(detail.created_at).toLocaleString("id-ID")}
              {detail.paid_at ? ` · Lunas ${new Date(detail.paid_at).toLocaleString("id-ID")}` : ""}
              {detail.payment ? ` · Pay: ${detail.payment.status}` : ""}
            </p>
            {detail.status === "pending_payment" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => cancel(detail.id)}
                className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-bold text-merah"
              >
                Batalkan pesanan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
