import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { markPacked } from "@/actions/partner";
import { ActionButton } from "@/components/ActionButton";
import { ItemRow } from "./ItemRow";

export const dynamic = "force-dynamic";

export default async function PickingDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await getSession("partner");
  if (!session) redirect("/partner/login");

  const task = await db.pickingTask.findFirst({
    where: { id: taskId, picker_id: session.sub },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: true,
              variant: { include: { hub_stocks: true } },
            },
          },
        },
      },
    },
  });
  if (!task) notFound();

  // Urut berdasar lokasi rak (FR-12.1) — stok per VARIANT
  const items = [...task.order.items].sort((a, b) => {
    const ra = a.variant?.hub_stocks.find((s) => s.hub_id === task.hub_id)?.rack_location ?? "";
    const rb = b.variant?.hub_stocks.find((s) => s.hub_id === task.hub_id)?.rack_location ?? "";
    return ra.localeCompare(rb);
  });
  const allMarked = items.every((i) => i.qty_fulfilled === i.qty_ordered || i.status === "oos");

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-lg font-extrabold tabular-nums">{task.order.order_number}</h1>
      <p className="text-xs text-tinta/60">
        Ikuti urutan rak dari atas ke bawah. Tandai setiap item <b>Lengkap</b> atau <b>Habis</b>.
      </p>

      <div className="kartu divide-y divide-black/5">
        {items.map((i) => (
          <ItemRow
            key={i.id}
            itemId={i.id}
            name={
              i.variant_name_snapshot && i.variant_name_snapshot !== "Standar"
                ? `${i.product_name_snapshot} (${i.variant_name_snapshot})`
                : i.product_name_snapshot
            }
            rack={
              i.variant?.hub_stocks.find((s) => s.hub_id === task.hub_id)?.rack_location ?? ""
            }
            qtyOrdered={i.qty_ordered}
            qtyFulfilled={i.qty_fulfilled}
          />
        ))}
      </div>

      {task.status === "picking" ? (
        <>
          {!allMarked && <p className="text-center text-xs font-semibold text-tinta/60">Tandai semua item dulu untuk menyelesaikan packing.</p>}
          {allMarked && (
            <ActionButton action={markPacked.bind(null, task.id)}>📦 Selesai packing — siap diantar</ActionButton>
          )}
        </>
      ) : (
        <p className="kartu p-4 text-center text-sm font-bold text-hijau">Sudah dipacking ✓ Menunggu driver.</p>
      )}
    </div>
  );
}
