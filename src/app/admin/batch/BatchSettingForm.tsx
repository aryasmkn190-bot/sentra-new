"use client";

import { useActionState, useState } from "react";
import { updateBatchSetting } from "@/actions/batch";
import { BATCH_DAY_NAMES } from "@/lib/batch";

type Props = {
  batch: any;
  evaluation: any;
  orderStats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
  };
};

export function BatchSettingForm({ batch, evaluation, orderStats }: Props) {
  const [state, formAction, pending] = useActionState(updateBatchSetting, null);
  const [isActive, setIsActive] = useState(batch?.is_active ?? true);
  const [overrideMode, setOverrideMode] = useState(batch?.override_mode ?? "auto");

  return (
    <div className="space-y-6">
      {/* Kartu Status Live */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Status Batch Saat Ini
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                  evaluation.isOpen
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-merah"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    evaluation.isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                {evaluation.isOpen ? "BATCH SEDANG DIBUKA" : "BATCH DITUTUP"}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                · {evaluation.currentWibTime}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Batch Berjalan
            </span>
            <p className="text-lg font-extrabold text-slate-900">{batch.name}</p>
          </div>
        </div>

        {/* Ringkasan & Keterangan */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Jadwal Rutin</p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
              {evaluation.scheduleText}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Mode Sistem</p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
              {!isActive
                ? "Sistem Batch Nonaktif (Buka 24 Jam)"
                : overrideMode === "force_open"
                ? "Buka Manual (Force Open)"
                : overrideMode === "force_closed"
                ? "Tutup Manual (Force Closed)"
                : "Otomatis Sesuai Jadwal"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Pesanan di {batch.name}</p>
            <p className="mt-0.5 text-xs font-extrabold text-[#A00000]">
              {orderStats.totalOrders} Pesanan{" "}
              <span className="text-[10px] font-semibold text-slate-500">
                ({orderStats.completedOrders} lunas)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Pengaturan */}
      <form action={formAction} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-5">
        <input type="hidden" name="id" value={batch.id} />

        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Konfigurasi Jadwal Pembelian</h2>
            <p className="text-xs text-slate-500">
              Jika aktif, produk online reguler hanya bisa dibeli saat batch dibuka. Produk Order Langsung (Hub PTO) tetap buka kapan saja.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-focus:outline-none" />
            <span className="ml-2 text-xs font-extrabold text-slate-700">
              {isActive ? "Aktif" : "Nonaktif"}
            </span>
          </label>
        </div>

        {state?.error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-merah">
            {state.error}
          </div>
        )}

        {state?.ok && (
          <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            Pengaturan batch berhasil disimpan!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Nama Batch</label>
            <input
              type="text"
              name="name"
              defaultValue={batch.name}
              placeholder="Contoh: Batch 29"
              required
              className="input max-w-md font-bold"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Dapat melanjutkan penomoran batch dari aplikasi Sentra sebelumnya.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Waktu Buka */}
            <div className="rounded-xl border border-black/5 bg-slate-50/50 p-4 space-y-3">
              <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Waktu Buka Batch
              </p>
              <div>
                <label className="label">Hari Buka</label>
                <select name="open_day" defaultValue={batch.open_day} className="input">
                  {BATCH_DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Jam Buka (WIB)</label>
                <input
                  type="time"
                  name="open_time"
                  defaultValue={batch.open_time}
                  required
                  className="input font-mono"
                />
              </div>
            </div>

            {/* Waktu Tutup */}
            <div className="rounded-xl border border-black/5 bg-slate-50/50 p-4 space-y-3">
              <p className="text-xs font-extrabold text-merah flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Waktu Tutup Batch
              </p>
              <div>
                <label className="label">Hari Tutup</label>
                <select name="close_day" defaultValue={batch.close_day} className="input">
                  {BATCH_DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Jam Tutup (WIB)</label>
                <input
                  type="time"
                  name="close_time"
                  defaultValue={batch.close_time}
                  required
                  className="input font-mono"
                />
              </div>
            </div>
          </div>

          {/* Override Mode */}
          <div>
            <label className="label">Mode Status</label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-xs font-extrabold transition ${
                  overrideMode === "auto"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="override_mode"
                  value="auto"
                  checked={overrideMode === "auto"}
                  onChange={() => setOverrideMode("auto")}
                  className="sr-only"
                />
                Otomatis (Jadwal)
              </label>

              <label
                className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-xs font-extrabold transition ${
                  overrideMode === "force_open"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="override_mode"
                  value="force_open"
                  checked={overrideMode === "force_open"}
                  onChange={() => setOverrideMode("force_open")}
                  className="sr-only"
                />
                Buka Sekarang (Override)
              </label>

              <label
                className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-xs font-extrabold transition ${
                  overrideMode === "force_closed"
                    ? "border-red-500 bg-red-50 text-merah"
                    : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="override_mode"
                  value="force_closed"
                  checked={overrideMode === "force_closed"}
                  onChange={() => setOverrideMode("force_closed")}
                  className="sr-only"
                />
                Tutup Sekarang (Override)
              </label>
            </div>
          </div>

          {/* Pesan saat batch ditutup */}
          <div>
            <label className="label">Pesan Ketika Batch Tutup (Opsional)</label>
            <textarea
              name="closed_message"
              defaultValue={batch.closed_message || ""}
              rows={3}
              placeholder="Pesan yang tampil ke user saat mencoba checkout di luar jadwal batch..."
              className="input text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-black/5">
          <button type="submit" disabled={pending} className="btn-utama !px-6 !py-2.5">
            {pending ? "Menyimpan Perubahan…" : "Simpan Pengaturan Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
