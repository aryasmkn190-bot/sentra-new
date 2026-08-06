import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { DeliveryActions } from "./DeliveryActions";

export const dynamic = "force-dynamic";

export default async function DeliveryDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await getSession("partner");
  if (!session) redirect("/partner/login");

  const task = await db.deliveryTask.findFirst({
    where: { id: taskId, driver_id: session.sub },
    include: { order: true },
  });
  if (!task) notFound();

  const addr = task.order.address_snapshot as Record<string, string>;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-lg font-extrabold tabular-nums">{task.order.order_number}</h1>

      <section className="kartu space-y-1 p-4 text-sm">
        <p className="text-xs font-extrabold uppercase text-hijau">Tujuan</p>
        <p className="font-extrabold">{addr.recipient_name}</p>
        <p className="text-tinta/70">{addr.full_address}</p>
        {addr.courier_note && <p className="text-xs italic text-tinta/60">Catatan: "{addr.courier_note}"</p>}
        {task.order.delivery_note && <p className="text-xs italic text-tinta/60">Catatan penjual: &quot;{task.order.delivery_note}&quot;</p>}
        <div className="flex gap-2 pt-2">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-garis flex-1 !py-2 !text-xs">
            🗺️ Navigasi
          </a>
          <a href={`tel:${addr.recipient_phone}`} className="btn-garis flex-1 !py-2 !text-xs">
            📞 Hubungi
          </a>
        </div>
      </section>

      {task.status === "delivered" ? (
        <p className="kartu p-4 text-center text-sm font-bold text-hijau">Pengantaran selesai ✓</p>
      ) : (
        <DeliveryActions taskId={task.id} status={task.status} />
      )}
    </div>
  );
}
