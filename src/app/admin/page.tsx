import Link from "next/link";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Dashboard Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    ordersToday,
    ordersYesterday,
    completedToday,
    gmvAgg,
    gmvYesterdayAgg,
    pendingRefunds,
    lowStock,
    avgRating,
    recentOrders,
    gmv7Days,
  ] = await Promise.all([
    db.order.count({ where: { created_at: { gte: today }, status: { not: "cancelled" } } }),
    db.order.count({ where: { created_at: { gte: yesterday, lt: today }, status: { not: "cancelled" } } }),
    db.order.findMany({ where: { completed_at: { gte: today } }, select: { created_at: true, completed_at: true } }),
    db.order.aggregate({ where: { created_at: { gte: today }, status: { notIn: ["cancelled", "pending_payment"] } }, _sum: { total_amount: true } }),
    db.order.aggregate({ where: { created_at: { gte: yesterday, lt: today }, status: { notIn: ["cancelled", "pending_payment"] } }, _sum: { total_amount: true } }),
    db.refund.count({ where: { status: "pending" } }),
    db.hubStock.count({ where: { stock_qty: { lte: 5 } } }),
    db.review.aggregate({ _avg: { rating: true } }),
    db.order.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      include: { user: true, hub: true },
    }),
    // GMV 7 hari terakhir
    Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const agg = await db.order.aggregate({
          where: { created_at: { gte: d, lt: next }, status: { notIn: ["cancelled", "pending_payment"] } },
          _sum: { total_amount: true },
        });
        return { date: d, gmv: agg._sum.total_amount ?? 0 };
      })
    ),
  ]);

  // SLA: % order selesai <= 30 menit
  const within30 = completedToday.filter(
    (o) => o.completed_at && o.completed_at.getTime() - o.created_at.getTime() <= 30 * 60 * 1000
  ).length;
  const slaPct = completedToday.length > 0 ? Math.round((within30 / completedToday.length) * 100) : null;

  // Trend deltas
  const orderTrend = ordersYesterday > 0 ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100) : null;
  const gmvToday = gmvAgg._sum.total_amount ?? 0;
  const gmvYesterdayVal = gmvYesterdayAgg._sum.total_amount ?? 0;
  const gmvTrend = gmvYesterdayVal > 0 ? Math.round(((gmvToday - gmvYesterdayVal) / gmvYesterdayVal) * 100) : null;

  const maxGmv = Math.max(...gmv7Days.map((d) => d.gmv), 1);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const stats = [
    { label: "Order hari ini", value: String(ordersToday), trend: orderTrend, iconBg: "bg-blue-100", isPct: false },
    { label: "GMV hari ini", value: rupiah(gmvToday), trend: gmvTrend, iconBg: "bg-emerald-100", isPct: false },
    { label: "Terkirim <=30 mnt", value: slaPct === null ? "-" : `${slaPct}%`, trend: null, iconBg: "bg-amber-100", isPct: true },
    { label: "Rating rata-rata", value: avgRating._avg.rating ? avgRating._avg.rating.toFixed(2) : "-", trend: null, iconBg: "bg-emerald-100", isPct: false },
    { label: "Refund menunggu", value: String(pendingRefunds), trend: null, iconBg: "bg-red-100", isPct: false },
    { label: "SKU stok menipis", value: String(lowStock), trend: null, iconBg: "bg-red-100", isPct: false },
  ];

  const quickActions = [
    { href: "/admin/produk/baru", label: "Tambah Produk", sub: "Buat produk baru" },
    { href: "/admin/voucher/baru", label: "Voucher Baru", sub: "Promo / diskon" },
    { href: "/admin/banner/baru", label: "Banner Baru", sub: "Promosi storefront" },
    { href: "/admin/inventori", label: "Adjust Stok", sub: "Opname / masuk barang" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Dashboard Operasional</h1>
        <p className="text-xs font-semibold text-tinta/50">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="kartu p-4">
            <div className="mb-2 flex items-start justify-between">
              <p className="text-[11px] font-semibold text-tinta/60">{s.label}</p>
              <div className={`h-7 w-7 rounded-lg ${s.iconBg}`} />
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-slate-800">{s.value}</p>
            {s.trend !== null && (
              <p className={`mt-1 text-[10px] font-bold ${s.trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {s.trend >= 0 ? "+" : ""}{s.trend}% vs kemarin
              </p>
            )}
            {s.label === "Refund menunggu" && Number(s.value) > 0 && (
              <p className="mt-1 text-[10px] font-bold text-red-600">Perlu tindakan</p>
            )}
            {s.label === "SKU stok menipis" && Number(s.value) > 0 && (
              <p className="mt-1 text-[10px] font-bold text-red-600">Restock urgent</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Orders + Chart/Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="kartu p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800">Pesanan Terbaru</h2>
            <Link href="/admin/pesanan" className="text-xs font-bold text-hijau hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-black/5 text-left font-bold text-slate-500">
                  <th className="pb-2 pt-1">No. Order</th>
                  <th className="pb-2 pt-1">Pelanggan</th>
                  <th className="pb-2 pt-1 text-right">Total</th>
                  <th className="pb-2 pt-1">Status</th>
                  <th className="pb-2 pt-1 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-mono text-slate-500">{o.order_number}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{o.user.phone_number}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-700">{rupiah(o.total_amount)}</td>
                    <td className="py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="py-2.5 text-right">
                      <Link href={`/admin/pesanan/${o.id}`} className="font-bold text-hijau hover:underline">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">Belum ada pesanan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: GMV Chart + Quick Actions */}
        <div className="space-y-4">
          {/* GMV 7 Days Chart */}
          <div className="kartu p-4">
            <h2 className="mb-3 text-sm font-extrabold text-slate-800">GMV 7 Hari</h2>
            <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
              {gmv7Days.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-hijau transition-all hover:bg-hijau-tua"
                    style={{ height: `${Math.max((d.gmv / maxGmv) * 100, 2)}%` }}
                    title={rupiah(d.gmv)}
                  />
                  <span className="text-[8px] font-semibold text-slate-400">
                    {days[d.date.getDay()]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="kartu p-4">
            <h2 className="mb-3 text-sm font-extrabold text-slate-800">Aksi Cepat</h2>
            <div className="space-y-2">
              {quickActions.map((qa) => (
                <Link
                  key={qa.href}
                  href={qa.href}
                  className="flex items-center gap-3 rounded-lg bg-latar p-2.5 transition-colors hover:bg-hijau-muda"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-hijau">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{qa.label}</p>
                    <p className="text-[10px] text-slate-500">{qa.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SLA Note */}
      <p className="text-xs text-tinta/50">
        North Star Metric (PRD 4.3): jumlah pesanan sukses terkirim &lt;= 30 menit per minggu.
      </p>
    </div>
  );
}