"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrders, bulkUpdateOrderStatus } from "@/actions/admin";
import { rupiah } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { OrderDetailModal } from "./OrderDetailModal";

const ITEMS_PER_PAGE = 20;

const STATUS_FILTERS = [
  "all",
  "pending_payment",
  "confirmed",
  "picking",
  "packed",
  "on_delivery",
  "arrived",
  "completed",
  "cancelled",
  "refunded",
] as const;

const BULK_TARGETS = [
  "confirmed",
  "picking",
  "packed",
  "on_delivery",
  "arrived",
  "completed",
  "cancelled",
] as const;

type OrderItem = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: Date | string;
  user: { phone_number: string; name: string | null };
  hub: { code: string; name: string };
};

type DataState = { items: OrderItem[]; totalItems: number; currentPage: number } | null;

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("picking");
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getOrders(page, query || undefined, statusFilter || undefined);
    setData(result as DataState);
    setSelected(new Set());
    setLoading(false);
  }, [page, query, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    router.push(`/admin/pesanan?${params.toString()}`);
  };

  const handleFilter = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (query) params.set("q", query);
    router.push(`/admin/pesanan?${params.toString()}`);
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  const allChecked = items.length > 0 && items.every((o) => selected.has(o.id));
  const someChecked = items.some((o) => selected.has(o.id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((o) => o.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulk = async () => {
    if (selected.size === 0) return;
    setBulkPending(true);
    setBulkMsg(null);
    const res = await bulkUpdateOrderStatus(Array.from(selected), bulkStatus);
    setBulkPending(false);
    if (res && "error" in res && res.error) {
      setBulkMsg(res.error);
      return;
    }
    setBulkMsg(
      `${(res as { updated?: number }).updated ?? selected.size} pesanan diubah → ${STATUS_LABEL[bulkStatus] ?? bulkStatus}`
    );
    await fetchData();
  };

  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-slate-800">Pesanan</h1>

      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            name="q"
            defaultValue={query}
            placeholder="Cari no. order, nama, atau nomor HP..."
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                statusFilter === s ? "bg-hijau text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "Semua" : STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-emerald-800">{selected.size} pesanan dipilih</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-hijau focus:outline-none"
            >
              {BULK_TARGETS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulk}
              disabled={bulkPending}
              className="btn-utama !py-1.5 !px-4 text-xs font-bold disabled:opacity-50"
            >
              {bulkPending ? "Memproses…" : "Ubah Status"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {bulkMsg && <p className="text-xs font-bold text-slate-600">{bulkMsg}</p>}

      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-hijau focus:ring-hijau"
                    aria-label="Pilih semua"
                  />
                </th>
                <th className="p-4">No. Order</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Pelanggan</th>
                <th className="p-4">Hub</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    Tidak ada pesanan yang cocok.
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-hijau focus:ring-hijau"
                        aria-label={`Pilih ${o.order_number}`}
                      />
                    </td>
                    <td className="p-4 font-mono text-slate-500">{o.order_number}</td>
                    <td className="p-4 text-slate-500">{fmtTime(o.created_at)}</td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{o.user.name || "(tanpa nama)"}</p>
                      <p className="font-mono text-[10px] text-slate-500">{o.user.phone_number}</p>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{o.hub.code}</td>
                    <td className="p-4 text-right font-semibold tabular-nums text-slate-700">
                      {rupiah(o.total_amount)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailId(o.id)}
                        className="font-bold text-hijau hover:underline"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>

      <OrderDetailModal
        open={!!detailId}
        orderId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={fetchData}
      />
    </div>
  );
}
