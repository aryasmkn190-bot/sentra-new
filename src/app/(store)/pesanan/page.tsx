import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rupiah } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Pesanan Saya" };

export default async function OrdersPage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/pesanan");

  const orders = await db.order.findMany({
    where: { user_id: session.sub },
    orderBy: { created_at: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-lg font-extrabold">Pesanan Saya</h1>
      {orders.length === 0 ? (
        <div className="kartu p-8 text-center">
          <p className="mb-1 text-4xl" aria-hidden>📦</p>
          <p className="text-sm font-bold">Belum ada pesanan</p>
          <Link href="/" className="btn-utama mt-4">Mulai belanja</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/pesanan/${o.id}`} className="kartu block p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold tabular-nums">{o.order_number}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-xs text-tinta/60">
                {o.items.length} item · {new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-1 text-sm font-extrabold tabular-nums">{rupiah(o.total_amount)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
