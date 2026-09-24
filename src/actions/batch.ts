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

  const activeBatch = await getOrInitActiveBatch();
  const evaluation = evaluateBatch(activeBatch);

  // Ambil semua batch terdaftar
  const allBatchesRaw = await db.purchaseBatch.findMany({
    orderBy: { created_at: "desc" },
  });

  // Rekap pesanan & omzet tiap batch
  const allBatches = await Promise.all(
    allBatchesRaw.map(async (b) => {
      const [totalOrders, completedAgg, pendingOrders] = await Promise.all([
        db.order.count({
          where: { OR: [{ batch_id: b.id }, { batch_name: b.name }] },
        }),
        db.order.aggregate({
          where: {
            OR: [{ batch_id: b.id }, { batch_name: b.name }],
            status: "completed",
          },
          _sum: { total_amount: true },
          _count: { _all: true },
        }),
        db.order.count({
          where: {
            OR: [{ batch_id: b.id }, { batch_name: b.name }],
            status: "pending_payment",
          },
        }),
      ]);

      return {
        ...b,
        totalOrders,
        pendingOrders,
        completedOrders: completedAgg._count._all || 0,
        totalOmzet: completedAgg._sum.total_amount || 0,
      };
    })
  );

  // Cari batch aktif dari array
  const currentBatch = allBatches.find((b) => b.id === activeBatch.id) || allBatches[0];

  // Rekap pesanan pada batch aktif
  const orderStats = {
    totalOrders: currentBatch?.totalOrders || 0,
    pendingOrders: currentBatch?.pendingOrders || 0,
    completedOrders: currentBatch?.completedOrders || 0,
    totalOmzet: currentBatch?.totalOmzet || 0,
  };

  // Prediksi nama batch berikutnya (misal Batch 29 -> Batch 30)
  let highestNum = 28;
  for (const b of allBatchesRaw) {
    const match = b.name.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > highestNum) highestNum = num;
    }
  }
  const nextBatchSuggestion = `Batch ${highestNum + 1}`;

  return {
    batch: activeBatch,
    evaluation,
    orderStats,
    allBatches,
    nextBatchSuggestion,
  };
}

export async function createNextBatchAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir. Silakan login kembali." };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";
  const open_day = parseInt(String(formData.get("open_day") || "3"), 10);
  const open_time = String(formData.get("open_time") || "07:00").trim();
  const close_day = parseInt(String(formData.get("close_day") || "4"), 10);
  const close_time = String(formData.get("close_time") || "20:00").trim();
  const override_mode = String(formData.get("override_mode") || "auto").trim();
  const closed_message = String(formData.get("closed_message") || "").trim();

  if (!name) return { error: "Nama batch wajib diisi." };

  try {
    if (is_active) {
      // Nonaktifkan batch lain terlebih dahulu jika batch baru dijadikan aktif
      await db.purchaseBatch.updateMany({
        data: { is_active: false },
      });
    }

    await db.purchaseBatch.create({
      data: {
        name,
        description: description || `Periode belanja Sentra ${name}`,
        is_active,
        open_day,
        open_time,
        close_day,
        close_time,
        override_mode,
        closed_message: closed_message || null,
      },
    });
  } catch (err: unknown) {
    console.error("[createNextBatchAction]", err);
    return { error: "Gagal membuat batch baru." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/batch");
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/laporan");
  return { ok: true as const };
}

export async function setActiveBatchAction(batchId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };
  if (!batchId) return { error: "ID batch wajib diisi." };

  try {
    await db.$transaction([
      db.purchaseBatch.updateMany({
        data: { is_active: false },
      }),
      db.purchaseBatch.update({
        where: { id: batchId },
        data: { is_active: true },
      }),
    ]);
  } catch (err: unknown) {
    console.error("[setActiveBatchAction]", err);
    return { error: "Gagal mengaktifkan batch." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/batch");
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/laporan");
  return { ok: true as const };
}

export async function deleteBatchAction(batchId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };

  const batch = await db.purchaseBatch.findUnique({
    where: { id: batchId },
  });
  if (!batch) return { error: "Batch tidak ditemukan." };

  const orderCount = await db.order.count({
    where: { OR: [{ batch_id: batch.id }, { batch_name: batch.name }] },
  });

  if (orderCount > 0) {
    return {
      error: `Batch ${batch.name} tidak dapat dihapus karena sudah memiliki ${orderCount} pesanan.`,
    };
  }

  try {
    await db.purchaseBatch.delete({
      where: { id: batchId },
    });
  } catch (err) {
    console.error("[deleteBatchAction]", err);
    return { error: "Gagal menghapus batch." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/batch");
  return { ok: true as const };
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
      if (is_active) {
        await db.purchaseBatch.updateMany({
          where: { id: { not: id } },
          data: { is_active: false },
        });
      }
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
