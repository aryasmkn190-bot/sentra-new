"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  evaluateBatch,
  getOrInitActiveBatch,
  getCurrentBatchStatus,
  type BatchEvaluation,
} from "@/lib/batch";

async function requireAdmin() {
  return getSession("admin");
}

export async function getBatchStatusAction(): Promise<BatchEvaluation> {
  return getCurrentBatchStatus();
}

export async function getAdminBatchData() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const batch = await getOrInitActiveBatch();
  const evaluation = evaluateBatch(batch);

  // Rekap pesanan pada batch ini
  const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
    db.order.count({ where: { batch_name: batch.name } }),
    db.order.count({ where: { batch_name: batch.name, status: "pending_payment" } }),
    db.order.count({ where: { batch_name: batch.name, status: "completed" } }),
  ]);

  return {
    batch,
    evaluation,
    orderStats: {
      totalOrders,
      pendingOrders,
      completedOrders,
    },
  };
}

export async function updateBatchSetting(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Silakan login kembali." };

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";
  const open_day = parseInt(String(formData.get("open_day") || "3"), 10);
  const open_time = String(formData.get("open_time") || "07:00").trim();
  const close_day = parseInt(String(formData.get("close_day") || "4"), 10);
  const close_time = String(formData.get("close_time") || "20:00").trim();
  const override_mode = String(formData.get("override_mode") || "auto").trim();
  const closed_message = String(formData.get("closed_message") || "").trim();

  if (!name) return { error: "Nama batch wajib diisi." };

  try {
    if (id) {
      await db.purchaseBatch.update({
        where: { id },
        data: {
          name,
          is_active,
          open_day,
          open_time,
          close_day,
          close_time,
          override_mode,
          closed_message: closed_message || null,
        },
      });
    } else {
      await db.purchaseBatch.create({
        data: {
          name,
          is_active,
          open_day,
          open_time,
          close_day,
          close_time,
          override_mode,
          closed_message: closed_message || null,
        },
      });
    }
  } catch (err: unknown) {
    console.error("[updateBatchSetting]", err);
    return { error: "Gagal menyimpan pengaturan batch." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/batch");
  return { ok: true as const };
}
