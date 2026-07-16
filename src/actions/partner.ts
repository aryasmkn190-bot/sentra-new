"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { transitionOrder } from "@/lib/orders";

async function currentPartner(expectedRole: "picker" | "driver") {
  const session = await getSession("partner");
  if (!session) return null;
  const partner = await db.partner.findUnique({ where: { id: session.sub } });
  if (!partner || partner.role !== expectedRole || partner.status !== "active") return null;
  return partner;
}

/** FR-12.1 — picker mengambil tugas dari antrean (FIFO). */
export async function claimPickingTask(taskId: string) {
  const picker = await currentPartner("picker");
  if (!picker) return { error: "Sesi picker tidak valid." };
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.pickingTask.updateMany({
        where: { id: taskId, status: "queued", hub_id: picker.hub_id },
        data: { status: "picking", picker_id: picker.id, started_at: new Date() },
      });
      if (updated.count === 0) throw new Error("Tugas sudah diambil picker lain.");
      const task = await tx.pickingTask.findUnique({ where: { id: taskId } });
      if (task) await transitionOrder(tx, task.order_id, "confirmed", "picking", "partner", picker.id);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal" };
  }
  revalidatePath("/partner/picker");
  return { ok: true };
}

/** FR-12.2 — tandai item terpenuhi / habis (memicu refund parsial sesuai preferensi). */
export async function setItemFulfillment(orderItemId: string, qtyFulfilled: number) {
  const picker = await currentPartner("picker");
  if (!picker) return { error: "Sesi picker tidak valid." };
  const item = await db.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item) return { error: "Item tidak ditemukan." };
  const qty = Math.max(0, Math.min(qtyFulfilled, item.qty_ordered));
  await db.orderItem.update({
    where: { id: orderItemId },
    data: { qty_fulfilled: qty, status: qty === 0 ? "oos" : "fulfilled" },
  });
  revalidatePath("/partner/picker", "layout");
  return { ok: true };
}

/** FR-12.3 — selesai packing → buat tugas antar (pool driver), refund parsial utk item OOS. */
export async function markPacked(taskId: string) {
  const picker = await currentPartner("picker");
  if (!picker) return { error: "Sesi picker tidak valid." };
  try {
    await db.$transaction(async (tx) => {
      const task = await tx.pickingTask.findFirst({
        where: { id: taskId, picker_id: picker.id, status: "picking" },
        include: { order: { include: { items: true, payments: { where: { status: "paid" }, take: 1 } } } },
      });
      if (!task) throw new Error("Tugas tidak ditemukan / bukan milikmu.");

      await tx.pickingTask.update({
        where: { id: task.id },
        data: { status: "packed", packed_at: new Date() },
      });

      // Refund parsial otomatis untuk item yang tidak terpenuhi (alur §11.2)
      const shortfall = task.order.items.reduce(
        (sum, i) => sum + (i.qty_ordered - i.qty_fulfilled) * i.price_snapshot,
        0
      );
      const paid = task.order.payments[0];
      if (shortfall > 0 && paid) {
        await tx.refund.create({
          data: {
            payment_id: paid.id,
            order_id: task.order_id,
            amount: shortfall,
            type: "partial",
            reason: "Item habis saat picking",
          },
        });
      }

      await tx.deliveryTask.create({ data: { order_id: task.order_id } });
      await transitionOrder(tx, task.order_id, "picking", "packed", "partner", picker.id);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal" };
  }
  revalidatePath("/partner/picker");
  return { ok: true };
}

/** FR-12.4 — driver mengambil tugas dari pool. */
export async function claimDeliveryTask(taskId: string) {
  const driver = await currentPartner("driver");
  if (!driver) return { error: "Sesi driver tidak valid." };
  const updated = await db.deliveryTask.updateMany({
    where: { id: taskId, driver_id: null, status: "assigned" },
    data: { driver_id: driver.id, assigned_at: new Date() },
  });
  if (updated.count === 0) return { error: "Tugas sudah diambil driver lain." };
  revalidatePath("/partner/driver");
  return { ok: true };
}

/** FR-12.5 — update status pengantaran + bukti foto. */
export async function updateDeliveryStatus(taskId: string, action: "picked_up" | "arrived" | "delivered", proofUrl?: string) {
  const driver = await currentPartner("driver");
  if (!driver) return { error: "Sesi driver tidak valid." };
  try {
    await db.$transaction(async (tx) => {
      const task = await tx.deliveryTask.findFirst({
        where: { id: taskId, driver_id: driver.id },
        include: { order: true },
      });
      if (!task) throw new Error("Tugas tidak ditemukan / bukan milikmu.");

      if (action === "picked_up" && task.status === "assigned") {
        await tx.deliveryTask.update({ where: { id: task.id }, data: { status: "on_the_way" } });
        await transitionOrder(tx, task.order_id, "packed", "on_delivery", "partner", driver.id);
      } else if (action === "arrived" && task.status === "on_the_way") {
        await tx.deliveryTask.update({ where: { id: task.id }, data: { status: "arrived" } });
        await transitionOrder(tx, task.order_id, "on_delivery", "arrived", "partner", driver.id);
      } else if (action === "delivered" && ["arrived", "on_the_way"].includes(task.status)) {
        await tx.deliveryTask.update({
          where: { id: task.id },
          data: { status: "delivered", delivered_at: new Date(), proof_photo_url: proofUrl || null },
        });
        await transitionOrder(tx, task.order_id, task.order.status, "completed", "partner", driver.id, "Pesanan diterima pelanggan");
      } else {
        throw new Error("Transisi status tidak valid.");
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal" };
  }
  revalidatePath("/partner/driver", "layout");
  return { ok: true };
}
