"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  updateBatchSetting,
  createNextBatchAction,
  setActiveBatchAction,
  deleteBatchAction,
} from "@/actions/batch";
import { BATCH_DAY_NAMES } from "@/lib/batch";
import { rupiah } from "@/lib/money";

type BatchItem = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  open_day: number;
  open_time: string;
  close_day: number;
  close_time: string;
  override_mode: string;
  closed_message: string | null;
  created_at: Date | string;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalOmzet: number;
};

type Props = {
  batch: any;
  evaluation: any;
  orderStats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalOmzet: number;
  };
  allBatches?: BatchItem[];
  nextBatchSuggestion?: string;
};

export function BatchSettingForm({
  batch,
  evaluation,
  orderStats,
  allBatches = [],
  nextBatchSuggestion = "Batch 30",
}: Props) {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batch?.id);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) || batch;

  const [state, formAction, pending] = useActionState(updateBatchSetting, null);
  const [createState, createFormAction, createPending] = useActionState(
    createNextBatchAction,
    null
  );

  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [isActive, setIsActive] = useState(selectedBatch?.is_active ?? true);
  const [overrideMode, setOverrideMode] = useState(selectedBatch?.override_mode ?? "auto");

  // Ketika berpindah batch yang ingin diedit
  const handleSelectBatch = (b: BatchItem) => {
    setSelectedBatchId(b.id);
    setIsActive(b.is_active);
    setOverrideMode(b.override_mode);
  };

  const handleSetActive = (bId: string, bName: string) => {
    if (!confirm(`Jadikan ${bName} sebagai batch aktif utama sekarang?`)) return;
    startTransition(async () => {
      setActionMsg(null);
      const res = await setActiveBatchAction(bId);
      if (res?.error) {
        setActionMsg({ type: "error", text: res.error });
      } else {
        setActionMsg({ type: "success", text: `${bName} sekarang aktif sebagai batch utama.` });
      }
    });
  };

  const handleDeleteBatch = (bId: string, bName: string) => {
    if (!confirm(`Hapus ${bName}? Tindakan ini tidak dapat dibatalkan.`)) return;
    startTransition(async () => {
      setActionMsg(null);
      const res = await deleteBatchAction(bId);
      if (res?.error) {
        setActionMsg({ type: "error", text: res.error });
      } else {
        setActionMsg({ type: "success", text: `${bName} berhasil dihapus.` });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert pesan aksi */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-bold ${
            actionMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-merah border border-red-200"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kartu Status Live Batch Aktif */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Status Batch Berjalan Saat Ini
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <span>✨</span> Mulai Batch Berikutnya ({nextBatchSuggestion})
            </button>
            <div className="text-right pl-3 border-l border-slate-100 hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Batch Aktif
              </span>
              <p className="text-base font-extrabold text-slate-900">{batch.name}</p>
            </div>
          </div>
        </div>

        {/* Ringkasan & Keterangan */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Jadwal Rutin</p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
              {evaluation.scheduleText}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Mode Sistem</p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
              {!batch.is_active
                ? "Sistem Batch Nonaktif (Buka 24 Jam)"
                : batch.override_mode === "force_open"
                ? "Buka Manual (Force Open)"
                : batch.override_mode === "force_closed"
                ? "Tutup Manual (Force Closed)"
                : "Otomatis Sesuai Jadwal"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Pesanan di {batch.name}</p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
              {orderStats.totalOrders} Pesanan{" "}
              <span className="text-[10px] font-semibold text-emerald-600">
                ({orderStats.completedOrders} lunas)
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Omzet Lunas</p>
            <p className="mt-0.5 text-xs font-extrabold text-emerald-600">
              {rupiah(orderStats.totalOmzet || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat & Daftar Seluruh Batch */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/5 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Daftar Siklus Batch Sentra</h2>
            <p className="text-xs text-slate-500">
              Kelola penomoran batch berkelanjutan (Batch 29, 30, dst.), pantau pesanan tiap periode, dan aktifkan batch yang sedang berjalan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="self-start sm:self-auto rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
          >
            + Buat Batch Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
              <tr>
                <th className="p-3">Nama Batch</th>
                <th className="p-3">Status</th>
                <th className="p-3">Jadwal Buka - Tutup</th>
                <th className="p-3 text-center">Total Order</th>
                <th className="p-3 text-right">Omzet Lunas</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {allBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400">
                    Belum ada batch terdaftar.
                  </td>
                </tr>
              ) : (
                allBatches.map((b) => {
                  const isCurrent = b.id === batch.id;
                  const isSelected = b.id === selectedBatchId;
                  const openDay = BATCH_DAY_NAMES[b.open_day] ?? "Rabu";
                  const closeDay = BATCH_DAY_NAMES[b.close_day] ?? "Kamis";

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="p-3 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{b.name}</span>
                          {b.is_active && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase">
                              Aktif Sekarang
                            </span>
                          )}
                          {isCurrent && !b.is_active && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                              Terpilih
                            </span>
                          )}
                        </div>
                        {b.description && (
                          <p className="text-[11px] font-normal text-slate-400 mt-0.5 line-clamp-1">
                            {b.description}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            b.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {b.is_active ? "Batch Aktif" : "Arsip / Tutup"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {openDay} {b.open_time} – {closeDay} {b.close_time} WIB
                        <span className="block text-[10px] text-slate-400">
                          Mode: {b.override_mode === "force_open" ? "Buka Manual" : b.override_mode === "force_closed" ? "Tutup Manual" : "Otomatis"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-extrabold text-slate-800">{b.totalOrders}</span>
                        <span className="text-[10px] text-slate-400 block">
                          ({b.completedOrders} lunas)
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 tabular-nums">
                        {rupiah(b.totalOmzet)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!b.is_active && (
                            <button
                              type="button"
                              onClick={() => handleSetActive(b.id, b.name)}
                              disabled={isPending}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              Jadikan Aktif
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectBatch(b)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                              isSelected
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-700 border-black/10 hover:bg-slate-50"
                            }`}
                          >
                            {isSelected ? "Sedang Diedit" : "Edit"}
                          </button>
                          <Link
                            href={`/admin/pesanan?batch=${encodeURIComponent(b.name)}`}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition"
                          >
                            Pesanan
                          </Link>
                          <Link
                            href={`/admin/laporan?batch=${encodeURIComponent(b.name)}`}
                            className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition"
                          >
                            Laporan
                          </Link>
                          {b.totalOrders === 0 && !b.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b.id, b.name)}
                              disabled={isPending}
                              className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-merah hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Pengaturan Batch yang Dipilih */}
      <form action={formAction} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-5">
        <input type="hidden" name="id" value={selectedBatch?.id || ""} />

        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Form Konfigurasi
            </span>
            <h2 className="text-base font-extrabold text-slate-900">
              Pengaturan: {selectedBatch?.name || "Batch"}
            </h2>
            <p className="text-xs text-slate-500">
              Atur jadwal buka-tutup rutin dan pesan notifikasi saat batch ini berjalan.
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
              {isActive ? "Batch Aktif" : "Nonaktif (Arsip)"}
            </span>
          </label>
        </div>

        {state?.error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-merah border border-red-200">
            {state.error}
          </div>
        )}

        {state?.ok && (
          <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
            Pengaturan batch berhasil disimpan!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Nama Batch</label>
            <input
              type="text"
              name="name"
              key={`name-${selectedBatch?.id}`}
              defaultValue={selectedBatch?.name || ""}
              placeholder="Contoh: Batch 29"
              required
              className="input max-w-md font-bold"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Melanjutkan siklus penomoran (misal Batch 29, Batch 30, dst).
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
                <select
                  name="open_day"
                  key={`open_day-${selectedBatch?.id}`}
                  defaultValue={selectedBatch?.open_day ?? 3}
                  className="input"
                >
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
                  key={`open_time-${selectedBatch?.id}`}
                  defaultValue={selectedBatch?.open_time || "07:00"}
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
                <select
                  name="close_day"
                  key={`close_day-${selectedBatch?.id}`}
                  defaultValue={selectedBatch?.close_day ?? 4}
                  className="input"
                >
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
                  key={`close_time-${selectedBatch?.id}`}
                  defaultValue={selectedBatch?.close_time || "20:00"}
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
              key={`closed_msg-${selectedBatch?.id}`}
              defaultValue={selectedBatch?.closed_message || ""}
              rows={3}
              placeholder="Pesan yang tampil ke user saat mencoba checkout di luar jadwal batch..."
              className="input text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-black/5">
          <p className="text-[11px] text-slate-400">
            Perubahan jadwal otomatis berlaku untuk storefront dan checkout.
          </p>
          <button type="submit" disabled={pending} className="btn-utama !px-6 !py-2.5">
            {pending ? "Menyimpan Perubahan…" : `Simpan Pengaturan ${selectedBatch?.name || ""}`}
          </button>
        </div>
      </form>

      {/* Modal Mulai Batch Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Mulai Batch Baru</h3>
                <p className="text-xs text-slate-500">
                  Lanjutkan ke periode batch berikutnya (misal {nextBatchSuggestion}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              action={async (fd) => {
                await createFormAction(fd);
                setShowCreateModal(false);
              }}
              className="space-y-4"
            >
              {createState?.error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-merah">
                  {createState.error}
                </div>
              )}

              <div>
                <label className="label">Nama Batch Baru</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={nextBatchSuggestion}
                  required
                  placeholder="Contoh: Batch 30"
                  className="input font-bold"
                />
              </div>

              <div>
                <label className="label">Keterangan / Deskripsi Singkat</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={`Periode Belanja Sentra ${nextBatchSuggestion}`}
                  placeholder="Deskripsi periode..."
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-emerald-800">Buka</p>
                  <select name="open_day" defaultValue={batch?.open_day ?? 3} className="input !text-xs">
                    {BATCH_DAY_NAMES.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    name="open_time"
                    defaultValue={batch?.open_time || "07:00"}
                    required
                    className="input !text-xs font-mono"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-merah">Tutup</p>
                  <select name="close_day" defaultValue={batch?.close_day ?? 4} className="input !text-xs">
                    {BATCH_DAY_NAMES.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    name="close_time"
                    defaultValue={batch?.close_time || "20:00"}
                    required
                    className="input !text-xs font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={true}
                    className="h-4 w-4 rounded border-slate-300 text-hijau focus:ring-hijau"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-emerald-900">
                      Langsung jadikan batch aktif
                    </span>
                    <p className="text-[10px] text-emerald-700">
                      Batch sebelumnya akan otomatis diarsipkan dan batch baru ini menjadi tujuan pesanan berikutnya.
                    </p>
                  </div>
                </label>
              </div>

              <input type="hidden" name="override_mode" value="auto" />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createPending}
                  className="btn-utama !py-2 !px-5 text-xs"
                >
                  {createPending ? "Membuat Batch…" : `Buat & Simpan Batch`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
