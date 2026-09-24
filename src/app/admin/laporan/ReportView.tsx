"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { getOnlineOrderReport } from "@/actions/admin";
import { STATUS_LABEL } from "@/lib/orders";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

type ReportData = Awaited<ReturnType<typeof getOnlineOrderReport>>;

type Props = {
  initialData: ReportData;
  initialBatch?: string;
  initialPeriod?: "today" | "7d" | "30d" | "this_month" | "all" | "custom";
  initialStatus?: string;
};

export function OnlineOrderReportView({
  initialData,
  initialBatch = "all",
  initialPeriod = "30d",
  initialStatus = "all",
}: Props) {
  const [data, setData] = useState<ReportData>(initialData);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "this_month" | "all" | "custom">(
    (data?.period as any) || initialPeriod
  );
  const [batchId, setBatchId] = useState<string>(initialBatch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [activeTab, setActiveTab] = useState<"products" | "customers" | "batches" | "orders">("products");
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const [isPending, startTransition] = useTransition();

  const applyFilters = (
    p = period,
    b = batchId,
    s = statusFilter,
    start = startDate,
    end = endDate
  ) => {
    startTransition(async () => {
      const res = await getOnlineOrderReport({
        period: p,
        batchId: b,
        statusFilter: s,
        startDateStr: p === "custom" ? start : undefined,
        endDateStr: p === "custom" ? end : undefined,
      });
      if (res) setData(res);
    });
  };

  const handlePeriodChange = (newPeriod: "today" | "7d" | "30d" | "this_month" | "all" | "custom") => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      applyFilters(newPeriod, batchId, statusFilter);
    }
  };

  const handleBatchChange = (newBatch: string) => {
    setBatchId(newBatch);
    applyFilters(period, newBatch, statusFilter);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    applyFilters(period, batchId, newStatus);
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate && !endDate) return;
    applyFilters("custom", batchId, statusFilter, startDate, endDate);
  };

  // Filtered Products for Tab 1
  const filteredProducts = useMemo(() => {
    if (!data?.productsSales) return [];
    if (!productSearch.trim()) return data.productsSales;
    const q = productSearch.toLowerCase();
    return data.productsSales.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [data?.productsSales, productSearch]);

  // Filtered Customers for Tab 2
  const filteredCustomers = useMemo(() => {
    if (!data?.customersSales) return [];
    if (!customerSearch.trim()) return data.customersSales;
    const q = customerSearch.toLowerCase();
    return data.customersSales.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.dropPoint.toLowerCase().includes(q)
    );
  }, [data?.customersSales, customerSearch]);

  // Filtered Orders for Tab 4
  const filteredOrders = useMemo(() => {
    if (!data?.ordersList) return [];
    if (!orderSearch.trim()) return data.ordersList;
    const q = orderSearch.toLowerCase();
    return data.ordersList.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.user_name.toLowerCase().includes(q) ||
        o.user_phone.includes(q) ||
        o.items_summary.toLowerCase().includes(q)
    );
  }, [data?.ordersList, orderSearch]);

  // Comprehensive Multi-Sheet Excel Export
  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    const batchNameDisplay =
      batchId === "all" ? "Semua Batch" : batchId === "none" ? "Tanpa Batch" : batchId;
    const periodDisplay =
      period === "today"
        ? "Hari Ini"
        : period === "7d"
        ? "7 Hari Terakhir"
        : period === "30d"
        ? "30 Hari Terakhir"
        : period === "this_month"
        ? "Bulan Ini"
        : period === "all"
        ? "Semua Waktu"
        : `Kustom (${startDate || "-"} s/d ${endDate || "-"})`;

    // Sheet 1: Ringkasan Finansial & Operasional
    const summaryData = [
      ["LAPORAN PESANAN ONLINE SENTRA"],
      ["Filter Batch", batchNameDisplay],
      ["Filter Periode", periodDisplay],
      ["Filter Status", statusFilter === "all" ? "Semua Status" : statusFilter],
      ["Tanggal Export", new Date().toLocaleString("id-ID")],
      [],
      ["METRIK FINANSIAL & OPERASIONAL", "NILAI"],
      ["Total Omzet Penjualan Selesai (Completed)", data.summary.totalOmzet],
      ["Total Subtotal Produk", data.summary.totalSubtotal],
      ["Total Diskon Voucher Pelanggan", data.summary.totalDiscount],
      ["Total Biaya Pengiriman", data.summary.totalDeliveryFee],
      ["Rata-rata Nilai Transaksi / AOV (Rp)", data.summary.aov],
      ["Total Pesanan Selesai (Completed)", data.summary.completedCount],
      ["Total Keseluruhan Pesanan", data.summary.totalOrders],
      ["Total Unit Produk Terjual (pcs)", data.summary.totalItemsSold],
      [],
      ["BREAKDOWN STATUS PESANAN", "JUMLAH ORDER"],
      ["Menunggu Pembayaran (pending_payment)", data.summary.counts.pending_payment],
      ["Dikonfirmasi (confirmed)", data.summary.counts.confirmed],
      ["Sedang Dipicking (picking)", data.summary.counts.picking],
      ["Siap Diantar (packed)", data.summary.counts.packed],
      ["Dalam Pengantaran (on_delivery)", data.summary.counts.on_delivery],
      ["Tiba di Tujuan (arrived)", data.summary.counts.arrived],
      ["Selesai (completed)", data.summary.counts.completed],
      ["Dibatalkan (cancelled)", data.summary.counts.cancelled],
      ["Refund (refunded)", data.summary.counts.refunded],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 40 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Finansial");

    // Sheet 2: Penjualan Per Produk
    const productsHeader = [
      [
        "No",
        "SKU Produk",
        "Nama Produk",
        "Kategori",
        "Total Qty Terjual (pcs)",
        "Total Omzet Penjualan (Rp)",
        "Rata-rata Harga Satuan (Rp)",
        "Kontribusi Omzet (%)",
        "Jumlah Transaksi Order",
      ],
    ];
    const productsRows = (data.productsSales || []).map((p, idx) => [
      idx + 1,
      p.sku,
      p.name,
      p.category,
      p.totalQty,
      p.totalRevenue,
      p.avgPrice,
      `${p.revenueShare}%`,
      p.orderCount,
    ]);
    const wsProducts = XLSX.utils.aoa_to_sheet([...productsHeader, ...productsRows]);
    wsProducts["!cols"] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 35 },
      { wch: 18 },
      { wch: 22 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProducts, "Penjualan Per Produk");

    // Sheet 3: Penjualan Per Customer
    const customersHeader = [
      [
        "No",
        "Nama Pelanggan",
        "Nomor WhatsApp / HP",
        "Email",
        "Drop Point Langganan",
        "Total Order",
        "Order Selesai",
        "Total Belanja (Rp)",
        "Rata-rata Belanja (Rp)",
        "Order Terakhir",
      ],
    ];
    const customersRows = (data.customersSales || []).map((c, idx) => [
      idx + 1,
      c.name,
      c.phone,
      c.email,
      c.dropPoint,
      c.totalOrders,
      c.completedOrders,
      c.totalSpend,
      c.avgOrderSpend,
      new Date(c.lastOrderDate).toLocaleString("id-ID"),
    ]);
    const wsCustomers = XLSX.utils.aoa_to_sheet([...customersHeader, ...customersRows]);
    wsCustomers["!cols"] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Penjualan Per Pelanggan");

    // Sheet 4: Rekapitulasi Per Batch
    const batchHeader = [
      [
        "No",
        "Nama Batch",
        "Status Batch",
        "Total Order",
        "Order Selesai",
        "Completion Rate (%)",
        "Total Omzet Lunas (Rp)",
        "AOV / Rata-rata Order (Rp)",
        "Pelanggan Unik",
      ],
    ];
    const batchRows = (data.batchBreakdown || []).map((b, idx) => [
      idx + 1,
      b.name,
      b.isActive ? "Aktif" : "Arsip",
      b.totalOrders,
      b.completedOrders,
      `${b.completionRate}%`,
      b.totalOmzet,
      b.aov,
      b.uniqueCustomersCount,
    ]);
    const wsBatch = XLSX.utils.aoa_to_sheet([...batchHeader, ...batchRows]);
    wsBatch["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBatch, "Rekap Per Batch");

    // Sheet 5: Detail Transaksi Seluruh Pesanan
    const ordersHeader = [
      [
        "No",
        "No Order",
        "Batch",
        "Tanggal Transaksi",
        "Nama Pelanggan",
        "No WhatsApp / HP",
        "Drop Point",
        "Status",
        "Subtotal Produk (Rp)",
        "Diskon (Rp)",
        "Ongkir (Rp)",
        "Total Bayar (Rp)",
        "Rincian Barang",
      ],
    ];
    const ordersRows = (data.ordersList || []).map((o, idx) => [
      idx + 1,
      o.order_number,
      o.batch_name,
      new Date(o.created_at).toLocaleString("id-ID"),
      o.user_name,
      o.user_phone,
      o.drop_point,
      STATUS_LABEL[o.status] || o.status,
      o.subtotal_amount,
      o.discount_amount,
      o.delivery_fee,
      o.total_amount,
      o.items_summary,
    ]);
    const wsOrders = XLSX.utils.aoa_to_sheet([...ordersHeader, ...ordersRows]);
    wsOrders["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, "Detail Pesanan");

    // Download file
    const safeBatchName = batchId === "all" ? "SemuaBatch" : batchId.replace(/\s+/g, "_");
    const fileName = `Laporan_Online_${safeBatchName}_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (!data) return <div className="p-4 text-slate-500">Gagal memuat laporan online.</div>;

  const { summary, availableBatches = [] } = data;

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Laporan Komprehensif Online</h1>
          <p className="text-xs text-slate-500">
            Analisis lengkap omzet, penjualan per produk, penjualan per customer, dan performa siklus batch Sentra.
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <span>📥</span> Export Excel Komprehensif (5 Sheet)
        </button>
      </div>

      {/* Filter Toolbar Terpadu */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Batch */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600 shrink-0">Batch:</label>
            <select
              value={batchId}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Batch</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} {b.is_active ? "🟢 (Aktif)" : ""}
                </option>
              ))}
              <option value="none">Tanpa Batch</option>
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600 shrink-0">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Hanya Selesai (Completed)</option>
              <option value="processing">Dalam Proses (Dipicking/Dikirim)</option>
              <option value="pending_payment">Menunggu Pembayaran</option>
              <option value="cancelled_or_refund">Batal / Refund</option>
            </select>
          </div>

          {/* Filter Preset Periode */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 flex-wrap">
            {(["today", "7d", "30d", "this_month", "all", "custom"] as const).map((p) => (
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
                {p === "today"
                  ? "Hari Ini"
                  : p === "7d"
                  ? "7 Hari"
                  : p === "30d"
                  ? "30 Hari"
                  : p === "this_month"
                  ? "Bulan Ini"
                  : p === "all"
                  ? "Semua"
                  : "Kustom"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Picker Inputs */}
        {period === "custom" && (
          <form
            onSubmit={handleApplyCustomDate}
            className="pt-3 border-t border-slate-100 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Sampai Tanggal
              </label>
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
              {isPending ? "Memuat…" : "Terapkan Rentang Tanggal"}
            </button>
          </form>
        )}
      </div>

      {/* Ringkasan Finansial KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Omzet Lunas</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{rupiah(summary.totalOmzet)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {summary.completedCount} pesanan selesai ({summary.totalOrders} total)
          </p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rata-rata Order (AOV)</p>
          <p className="mt-1 text-xl font-extrabold text-slate-800">{rupiah(summary.aov)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Nilai rata-rata per transaksi</p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Diskon Voucher</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">{rupiah(summary.totalDiscount)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Hemat dari voucher & promo</p>
        </div>

        <div className="kartu p-4 bg-white border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Barang Terjual</p>
          <p className="mt-1 text-xl font-extrabold text-blue-600">{summary.totalItemsSold} pcs</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Unit produk di pesanan selesai</p>
        </div>
      </div>

      {/* Breakdown Status Order Pills */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <p className="text-xs font-extrabold text-slate-700 mb-2">Distribusi Status Pesanan</p>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200">
            Selesai: {summary.counts.completed}
          </span>
          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-800 border border-blue-200">
            Proses/Kirim: {summary.counts.confirmed + summary.counts.picking + summary.counts.packed + summary.counts.on_delivery + summary.counts.arrived}
          </span>
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
            Menunggu Bayar: {summary.counts.pending_payment}
          </span>
          <span className="rounded-lg bg-red-50 px-2.5 py-1 text-merah border border-red-200">
            Batal/Refund: {summary.counts.cancelled + summary.counts.refunded}
          </span>
        </div>
      </div>

      {/* Navigation Tabs Laporan */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === "products"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🛍️</span> Penjualan Per Produk ({data.productsSales?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === "customers"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>👥</span> Penjualan Per Pelanggan ({data.customersSales?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === "batches"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📦</span> Performa Per Batch ({data.batchBreakdown?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === "orders"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📋</span> Seluruh Transaksi ({data.ordersList?.length || 0})
          </button>
        </div>

        {/* TAB 1: Penjualan Per Produk */}
        {activeTab === "products" && (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Rekap Penjualan Semua Produk</h2>
                <p className="text-xs text-slate-500">
                  Daftar lengkap produk yang terjual pada periode dan batch yang dipilih.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari produk / SKU / kategori..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[750px]">
                <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-center">Terjual</th>
                    <th className="p-3 text-right">Rata-rata Harga</th>
                    <th className="p-3 text-right">Total Omzet</th>
                    <th className="p-3 text-center">Kontribusi</th>
                    <th className="p-3 text-center">Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Tidak ada data penjualan produk pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <tr key={p.productId || idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                        <td className="p-3 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3 text-slate-500">{p.category}</td>
                        <td className="p-3 text-center font-extrabold text-slate-800">{p.totalQty} pcs</td>
                        <td className="p-3 text-right tabular-nums text-slate-600">{rupiah(p.avgPrice)}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 tabular-nums">
                          {rupiah(p.totalRevenue)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-extrabold text-[11px] text-slate-700">{p.revenueShare}%</span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(p.revenueShare, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-600">{p.orderCount} order</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Penjualan Per Pelanggan */}
        {activeTab === "customers" && (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Rekap Belanja Pelanggan (Customer Sales)</h2>
                <p className="text-xs text-slate-500">
                  Ranking pelanggan berdasarkan total nilai transaksi belanja pada filter terpilih.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari nama / WhatsApp / Drop Point..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[750px]">
                <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">WhatsApp / Telepon</th>
                    <th className="p-3">Drop Point Utama</th>
                    <th className="p-3 text-center">Frekuensi Order</th>
                    <th className="p-3 text-right">Rata-rata Order</th>
                    <th className="p-3 text-right">Total Belanja (LTV)</th>
                    <th className="p-3 text-right">Order Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada data pelanggan yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c, idx) => (
                      <tr key={c.userId || idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{c.phone}</td>
                        <td className="p-3 text-slate-600 font-medium">{c.dropPoint}</td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {c.totalOrders} order{" "}
                          <span className="text-[10px] text-emerald-600 font-normal">
                            ({c.completedOrders} lunas)
                          </span>
                        </td>
                        <td className="p-3 text-right tabular-nums text-slate-600 font-medium">
                          {rupiah(c.avgOrderSpend)}
                        </td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 tabular-nums">
                          {rupiah(c.totalSpend)}
                        </td>
                        <td className="p-3 text-right text-[11px] text-slate-400">
                          {new Date(c.lastOrderDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Performa Per Batch */}
        {activeTab === "batches" && (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Komparasi Performa Seluruh Batch</h2>
              <p className="text-xs text-slate-500">
                Bandingkan total transaksi, tingkat penyelesaian (completion rate), dan omzet antar periode batch.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Nama Batch</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Total Order</th>
                    <th className="p-3 text-center">Order Selesai</th>
                    <th className="p-3 text-center">Completion Rate</th>
                    <th className="p-3 text-center">Pelanggan Unik</th>
                    <th className="p-3 text-right">Rata-rata Order</th>
                    <th className="p-3 text-right">Total Omzet Lunas</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.batchBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Belum ada data batch.
                      </td>
                    </tr>
                  ) : (
                    data.batchBreakdown.map((b) => (
                      <tr key={b.name} className="hover:bg-slate-50/50">
                        <td className="p-3 font-extrabold text-slate-900">{b.name}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              b.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {b.isActive ? "Batch Aktif" : "Arsip"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{b.totalOrders}</td>
                        <td className="p-3 text-center font-extrabold text-emerald-700">{b.completedOrders}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{b.completionRate}%</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{b.uniqueCustomersCount}</td>
                        <td className="p-3 text-right tabular-nums text-slate-600">{rupiah(b.aov)}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 tabular-nums">
                          {rupiah(b.totalOmzet)}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/pesanan?batch=${encodeURIComponent(b.name)}`}
                            className="font-bold text-emerald-600 hover:underline"
                          >
                            Lihat Pesanan →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Seluruh Transaksi Pesanan */}
        {activeTab === "orders" && (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Log Rincian Pesanan Terfilter</h2>
                <p className="text-xs text-slate-500">
                  Seluruh pesanan individual yang masuk dalam parameter filter saat ini.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari no. order / nama / item..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[850px]">
                <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
                  <tr>
                    <th className="p-3">No. Order</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Drop Point</th>
                    <th className="p-3">Ringkasan Item</th>
                    <th className="p-3 text-right">Total Bayar</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada transaksi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700">{o.order_number}</td>
                        <td className="p-3">
                          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                            {o.batch_name}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(o.created_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{o.user_name}</p>
                          <p className="font-mono text-[10px] text-slate-500">{o.user_phone}</p>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{o.drop_point}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate" title={o.items_summary}>
                          {o.items_summary || "—"}
                        </td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 tabular-nums">
                          {rupiah(o.total_amount)}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
