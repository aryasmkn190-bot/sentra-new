"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { getDirectOrderReport } from "@/actions/direct-order";
import { DIRECT_STATUS_LABEL } from "@/lib/direct-status";
import { rupiah } from "@/lib/money";

type ReportData = Awaited<ReturnType<typeof getDirectOrderReport>>;

export function DirectOrderReportView({ initialData }: { initialData: ReportData }) {
  const [data, setData] = useState<ReportData>(initialData);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all" | "custom">(initialData?.period || "30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePeriodChange = (newPeriod: "today" | "7d" | "30d" | "all" | "custom") => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      startTransition(async () => {
        const res = await getDirectOrderReport(newPeriod);
        if (res) setData(res);
      });
    }
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate && !endDate) return;
    startTransition(async () => {
      const res = await getDirectOrderReport("custom", startDate || undefined, endDate || undefined);
      if (res) setData(res);
    });
  };

  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Laporan
    const summaryData = [
      ["Laporan", "Laporan Order Langsung (QR Gudang)"],
      ["Periode Filter", period === "today" ? "Hari Ini" : period === "7d" ? "7 Hari Terakhir" : period === "30d" ? "30 Hari Terakhir" : period === "all" ? "Semua Waktu" : `Kustom (${startDate || "-"} s/d ${endDate || "-"})`],
      ["Tanggal Export", new Date().toLocaleString("id-ID")],
      [],
      ["Metrik", "Nilai"],
      ["Total Omzet (Completed)", data.summary.totalOmzet],
      ["Jumlah Pesanan Selesai", data.summary.completedCount],
      ["Total Keseluruhan Pesanan", data.summary.totalOrders],
      ["Menunggu Pembayaran", data.summary.counts.pending_payment],
      ["Selesai", data.summary.counts.completed],
      ["Dibatalkan", data.summary.counts.cancelled],
      ["Kedaluwarsa (Expired)", data.summary.counts.expired],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

    // Sheet 2: Produk Terlaris
    const topProductsHeader = [["No", "ID Produk", "Nama Produk", "Total Qty Terjual (pcs)", "Total Omzet (Rp)", "Jumlah Transaksi"]];
    const topProductsRows = data.topProducts.map((p, i) => [
      i + 1,
      p.productId,
      p.name,
      p.totalQty,
      p.totalRevenue,
      p.orderCount,
    ]);
    const wsTopProducts = XLSX.utils.aoa_to_sheet([...topProductsHeader, ...topProductsRows]);
    XLSX.utils.book_append_sheet(wb, wsTopProducts, "Produk Terlaris");

    // Sheet 3: Daftar Pesanan
    const ordersHeader = [["No", "No Order", "Nama / No HP Pembeli", "Status", "Total Pembayaran (Rp)", "Nama Item", "Qty", "Harga Satuan (Rp)", "Tanggal Pesanan"]];
    const ordersRows = data.recentOrders.map((o, i) => [
      i + 1,
      o.order_number,
      o.user_name,
      DIRECT_STATUS_LABEL[o.status] || o.status,
      o.total_amount,
      o.item_name,
      o.qty,
      o.price,
      new Date(o.created_at).toLocaleString("id-ID"),
    ]);
    const wsOrders = XLSX.utils.aoa_to_sheet([...ordersHeader, ...ordersRows]);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Daftar Pesanan");

    // Trigger Download
    const fileName = `Laporan_Order_Langsung_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (!data) return <div className="p-4 text-slate-500">Gagal memuat laporan.</div>;

  const { summary, topProducts, recentOrders } = data;

  return (
    <div className="space-y-6">
      {/* Top Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Laporan Order Langsung</h1>
          <p className="text-xs text-slate-500">Ringkasan performa penjualan, omzet, dan produk terlaris via QR gudang</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <span>📥</span> Export Excel Multi-Sheet
          </button>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(["today", "7d", "30d", "all", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                disabled={isPending}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  period === p
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p === "today" ? "Hari Ini" : p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : p === "all" ? "Semua" : "Kustom"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Picker Inputs */}
      {period === "custom" && (
        <form onSubmit={handleApplyCustomDate} className="kartu p-4 bg-slate-50 border border-slate-200/80 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || (!startDate && !endDate)}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? "Memuat…" : "Terapkan Filter"}
          </button>
        </form>
      )}

      {/* Ringkasan Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Omzet</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{rupiah(summary.totalOmzet)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{summary.completedCount} pesanan selesai</p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pesanan</p>
          <p className="mt-1 text-xl font-extrabold text-slate-800">{summary.totalOrders}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Semua status</p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Menunggu Bayar</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">{summary.counts.pending_payment}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Order aktif di kasir/QR</p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Batal / Expired</p>
          <p className="mt-1 text-xl font-extrabold text-slate-400">
            {summary.counts.cancelled + summary.counts.expired}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Batal manual / timeout</p>
        </div>
      </div>

      {/* Grid: Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="kartu p-5 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Produk Terlaris (Order Langsung)</h2>
            <span className="text-[11px] text-slate-400">Top 10 Omzet</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada transaksi completed di periode ini.</p>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase border-b border-slate-100">
                    <th className="pb-2">Produk</th>
                    <th className="pb-2 text-center">Terjual</th>
                    <th className="pb-2 text-right">Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-semibold text-slate-800">
                        <span className="mr-2 text-slate-400 font-normal">#{i + 1}</span>
                        {p.name}
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-700">{p.totalQty} pcs</td>
                      <td className="py-2.5 text-right font-extrabold text-emerald-600">{rupiah(p.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaksi Terakhir */}
        <div className="kartu p-5 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Pesanan Terakhir</h2>
            <button
              onClick={() => router.push("/admin/order-langsung")}
              className="text-[11px] font-bold text-emerald-600 hover:underline"
            >
              Lihat Semua →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada pesanan di periode ini.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">{o.order_number}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          o.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "pending_payment"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {DIRECT_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {o.item_name} x{o.qty} · {o.user_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-900">{rupiah(o.total_amount)}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(o.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
