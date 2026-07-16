import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logoutPartner } from "@/actions/auth";
import { claimPickingTask } from "@/actions/partner";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Tugas Picking" };
export const dynamic = "force-dynamic";

export default async function PickerPage() {
  const session = await getSession("partner");
  if (!session) redirect("/partner/login");
  const picker = await db.partner.findUnique({ where: { id: session.sub } });
  if (!picker || picker.role !== "picker") redirect("/partner/login");

  const [queued, mine] = await Promise.all([
    db.pickingTask.findMany({
      where: { hub_id: picker.hub_id, status: "queued" },
      orderBy: { created_at: "asc" }, // FIFO (FR-12.1)
      include: { order: { include: { items: true } } },
    }),
    db.pickingTask.findMany({
      where: { picker_id: picker.id, status: "picking" },
      include: { order: { include: { items: true } } },
    }),
  ]);

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">Tugas Picking</h1>
          <p className="text-xs text-tinta/60">{picker.name}</p>
        </div>
        <form action={logoutPartner}>
          <button className="text-xs font-bold text-merah">Keluar</button>
        </form>
      </header>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold">Sedang kamu kerjakan</h2>
          {mine.map((t) => (
            <Link key={t.id} href={`/partner/picker/${t.id}`} className="kartu mb-2 block border-2 border-hijau p-4">
              <p className="text-sm font-extrabold tabular-nums">{t.order.order_number}</p>
              <p className="text-xs text-tinta/60">{t.order.items.length} item — lanjutkan picking →</p>
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-extrabold">Antrean ({queued.length})</h2>
        {queued.length === 0 ? (
          <p className="kartu p-6 text-center text-sm text-tinta/60">Antrean kosong. Tugas baru muncul otomatis setelah ada pembayaran masuk.</p>
        ) : (
          queued.map((t, i) => (
            <div key={t.id} className="kartu mb-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold tabular-nums">#{i + 1} · {t.order.order_number}</p>
                <p className="text-xs text-tinta/50">
                  {new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="mb-2 text-xs text-tinta/60">{t.order.items.length} item</p>
              <ActionButton action={claimPickingTask.bind(null, t.id)}>Ambil tugas</ActionButton>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
