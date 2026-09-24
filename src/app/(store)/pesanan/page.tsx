import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ORDER_LIST_TABS,
  isOrderListTabKey,
  statusesForOrderTab,
  type OrderListTabKey,
} from "@/lib/order-status";

export const metadata = { title: "Pesanan Saya" };

type SearchParams = Promise<{ tab?: string }>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/pesanan");

  const sp = await searchParams;
  const activeTab: OrderListTabKey = isOrderListTabKey(sp.tab) ? sp.tab : "menunggu";
  const statusFilter = statusesForOrderTab(activeTab);

  // Count per tab (untuk badge di pill)
  const allOrders = await db.order.findMany({
    where: { user_id: session.sub },
    select: { status: true },
  });
  const counts: Record<OrderListTabKey, number> = {
    menunggu: 0,
    diproses: 0,
    selesai: 0,
    dibatalkan: 0,
  };
  for (const o of allOrders) {
    for (const tab of ORDER_LIST_TABS) {
      if ((tab.statuses as readonly string[]).includes(o.status)) {
        counts[tab.key] += 1;
        break;
      }
    }
  }

  const orders = await db.order.findMany({
    where: {
      user_id: session.sub,
      status: { in: statusFilter },
    },
    orderBy: { created_at: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <div className="px-4 pt-4 pb-2">
      <h1 className="mb-3 text-lg font-extrabold text-tinta">Pesanan Saya</h1>

      {/*
        4 kategori fixed grid — TANPA overflow-x-auto / sticky.
        Menu lama pakai flex + overflow-x-auto → di mobile bisa digeser
        horizontal/vertikal (overscroll) seolah "bisa ke atas".
      */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {ORDER_LIST_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.key === "menunggu" ? "/pesanan" : `/pesanan?tab=${tab.key}`}
              scroll={false}
              className={`flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center transition ${
                active
                  ? "bg-[#A00000] text-white shadow-sm shadow-[#A00000]/25"
                  : "border border-black/10 bg-white text-slate-600 hover:border-[#A00000]/30 hover:text-[#A00000]"
              }`}
            >
              <span className="text-[11px] font-bold leading-tight sm:text-xs">
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {count > 0 && (
                <span
                  className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums leading-none ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="kartu p-8 text-center">
          <p className="mb-1 text-4xl" aria-hidden>
            {activeTab === "menunggu"
              ? "💳"
              : activeTab === "diproses"
                ? "⚡"
                : activeTab === "selesai"
                  ? "✅"
                  : "🚫"}
          </p>
          <p className="text-sm font-bold text-tinta">
            {activeTab === "menunggu" && "Tidak ada pesanan menunggu pembayaran"}
            {activeTab === "diproses" && "Tidak ada pesanan sedang diproses"}
            {activeTab === "selesai" && "Belum ada pesanan selesai"}
            {activeTab === "dibatalkan" && "Tidak ada pesanan dibatalkan"}
          </p>
          <p className="mt-1 text-xs text-tinta/50">
            {activeTab === "menunggu" || activeTab === "diproses"
              ? "Pesanan aktif akan muncul di sini."
              : "Riwayat kategori ini masih kosong."}
          </p>
          {(activeTab === "menunggu" || activeTab === "diproses") && (
            <Link href="/" className="btn-utama mt-4">
              Mulai belanja
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/pesanan/${o.id}`}
              className="kartu block p-4 transition hover:border-[#A00000]/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold tabular-nums text-tinta">
                  {o.order_number}
                </span>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-xs text-tinta/60">
                {o.items.length} item ·{" "}
                {new Date(o.created_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 text-sm font-extrabold tabular-nums text-tinta">
                {rupiah(o.total_amount)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
