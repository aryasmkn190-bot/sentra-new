import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logoutPartner } from "@/actions/auth";
import { claimDeliveryTask } from "@/actions/partner";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Tugas Antar" };
export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const session = await getSession("partner");
  if (!session) redirect("/partner/login");
  const driver = await db.partner.findUnique({ where: { id: session.sub } });
  if (!driver || driver.role !== "driver") redirect("/partner/login");

  const [pool, mine] = await Promise.all([
    db.deliveryTask.findMany({
      where: { driver_id: null, status: "assigned", order: { hub_id: driver.hub_id } },
      orderBy: { assigned_at: "asc" },
      include: { order: true },
    }),
    db.deliveryTask.findMany({
      where: { driver_id: driver.id, status: { in: ["assigned", "picked_up", "on_the_way", "arrived"] } },
      include: { order: true },
    }),
  ]);

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">Tugas Antar</h1>
          <p className="text-xs text-tinta/60">{driver.name} · {driver.vehicle_plate}</p>
        </div>
        <form action={logoutPartner}>
          <button className="text-xs font-bold text-merah">Keluar</button>
        </form>
      </header>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold">Pengantaran aktif</h2>
          {mine.map((t) => (
            <Link key={t.id} href={`/partner/driver/${t.id}`} className="kartu mb-2 block border-2 border-hijau p-4">
              <p className="text-sm font-extrabold tabular-nums">{t.order.order_number}</p>
              <p className="text-xs text-tinta/60">{(t.order.address_snapshot as Record<string, string>).full_address}</p>
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-extrabold">Siap diambil ({pool.length})</h2>
        {pool.length === 0 ? (
          <p className="kartu p-6 text-center text-sm text-tinta/60">Belum ada paket siap antar.</p>
        ) : (
          pool.map((t) => (
            <div key={t.id} className="kartu mb-2 p-4">
              <p className="text-sm font-extrabold tabular-nums">{t.order.order_number}</p>
              <p className="mb-2 text-xs text-tinta/60">{(t.order.address_snapshot as Record<string, string>).full_address}</p>
              <ActionButton action={claimDeliveryTask.bind(null, t.id)}>Ambil tugas antar</ActionButton>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
