import { db } from "./db";
import { BATCH_DAY_NAMES } from "./batch-constants";

export { BATCH_DAY_NAMES };

export type BatchEvaluation = {
  isOpen: boolean;
  isActive: boolean;
  batchId: string | null;
  batchName: string;
  scheduleText: string;
  nextScheduleText: string;
  closedMessage: string;
  currentWibTime: string;
};

/** Mengambil info waktu saat ini dalam WIB (UTC+7) */
export function getWIBTime(d = new Date()) {
  const wibTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wibTime.getUTCDay();
  const hours = wibTime.getUTCHours();
  const minutes = wibTime.getUTCMinutes();
  const minuteOfDay = hours * 60 + minutes;
  const weeklyMinute = day * 1440 + minuteOfDay;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const dayName = BATCH_DAY_NAMES[day];

  return {
    day,
    hours,
    minutes,
    minuteOfDay,
    weeklyMinute,
    timeStr,
    dayName,
    fullStr: `${dayName}, ${timeStr} WIB`,
  };
}

export function parseHHMM(str: string): number {
  const [h, m] = (str || "00:00").split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/** Ambil batch aktif (atau buat default Batch 29 jika belum ada) */
export async function getOrInitActiveBatch() {
  let batch = await db.purchaseBatch.findFirst({
    where: { is_active: true },
    orderBy: { created_at: "desc" },
  });

  if (!batch) {
    batch = await db.purchaseBatch.findFirst({
      orderBy: { created_at: "desc" },
    });
  }

  if (!batch) {
    batch = await db.purchaseBatch.create({
      data: {
        name: "Batch 29",
        description: "Melanjutkan sistem batch Sentra Old",
        is_active: true,
        open_day: 3, // Rabu
        open_time: "07:00",
        close_day: 4, // Kamis
        close_time: "20:00",
        override_mode: "auto",
        closed_message:
          "Pembelian produk online Sentra sedang ditutup dan akan dibuka sesuai jadwal batch. Produk Order Langsung di Hub PTO tetap bisa dibeli langsung.",
      },
    });
  }

  return batch;
}

/** Evaluasi status apakah batch sedang buka atau tutup */
export function evaluateBatch(
  batch: {
    id: string;
    name: string;
    is_active: boolean;
    open_day: number;
    open_time: string;
    close_day: number;
    close_time: string;
    override_mode: string;
    closed_message?: string | null;
  },
  now = new Date()
): BatchEvaluation {
  const wib = getWIBTime(now);

  const openDayName = BATCH_DAY_NAMES[batch.open_day] ?? "Rabu";
  const closeDayName = BATCH_DAY_NAMES[batch.close_day] ?? "Kamis";
  const scheduleText = `${openDayName} ${batch.open_time} s/d ${closeDayName} ${batch.close_time} WIB`;
  const nextScheduleText = `Dibuka setiap ${openDayName} pk ${batch.open_time} WIB`;
  const defaultClosedMsg = `Pembelian produk online (${batch.name}) sedang ditutup. Batch dibuka ${scheduleText}. Produk Order Langsung tetap bisa dipesan.`;
  const closedMessage = batch.closed_message || defaultClosedMsg;

  // Jika sistem batch tidak aktif, semua produk bebas dibeli kapan saja
  if (!batch.is_active) {
    return {
      isOpen: true,
      isActive: false,
      batchId: batch.id,
      batchName: batch.name,
      scheduleText,
      nextScheduleText,
      closedMessage,
      currentWibTime: wib.fullStr,
    };
  }

  // Jika ada override manual
  if (batch.override_mode === "force_open") {
    return {
      isOpen: true,
      isActive: true,
      batchId: batch.id,
      batchName: batch.name,
      scheduleText: `${scheduleText} (Manual Buka)`,
      nextScheduleText,
      closedMessage,
      currentWibTime: wib.fullStr,
    };
  }

  if (batch.override_mode === "force_closed") {
    return {
      isOpen: false,
      isActive: true,
      batchId: batch.id,
      batchName: batch.name,
      scheduleText,
      nextScheduleText: "Sedang ditutup manual oleh admin",
      closedMessage: batch.closed_message || "Pembelian produk sedang ditutup oleh admin.",
      currentWibTime: wib.fullStr,
    };
  }

  // Evaluasi jadwal otomatis
  const openMinuteOfDay = parseHHMM(batch.open_time);
  const closeMinuteOfDay = parseHHMM(batch.close_time);

  const openWeeklyMinute = batch.open_day * 1440 + openMinuteOfDay;
  const closeWeeklyMinute = batch.close_day * 1440 + closeMinuteOfDay;

  let isOpen = false;
  if (openWeeklyMinute <= closeWeeklyMinute) {
    isOpen =
      wib.weeklyMinute >= openWeeklyMinute && wib.weeklyMinute < closeWeeklyMinute;
  } else {
    // Lintas akhir pekan (misal Jumat malam sampai Senin pagi)
    isOpen =
      wib.weeklyMinute >= openWeeklyMinute || wib.weeklyMinute < closeWeeklyMinute;
  }

  return {
    isOpen,
    isActive: true,
    batchId: batch.id,
    batchName: batch.name,
    scheduleText,
    nextScheduleText,
    closedMessage,
    currentWibTime: wib.fullStr,
  };
}

/** Helper utama: dapatkan status batch terkini */
export async function getCurrentBatchStatus(): Promise<BatchEvaluation> {
  const batch = await getOrInitActiveBatch();
  return evaluateBatch(batch);
}
