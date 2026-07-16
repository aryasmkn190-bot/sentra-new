"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/actions/announcements";
import type { AnnouncementData } from "@/actions/announcements";

type Props = {
  announcement?: AnnouncementData | null;
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function AnnouncementForm({ announcement, inModal, onSuccess, onCancel }: Props) {
  const [isActive, setIsActive] = useState(announcement?.is_active ?? true);
  const [isDeleting, setIsDeleting] = useState(false);

  const action = announcement?.id
    ? updateAnnouncement.bind(null, announcement.id)
    : createAnnouncement;

  const [state, formAction, isPending] = useActionState(action, null);

  // Call onSuccess when submission succeeds
  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      // Small delay to let the form state settle
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const handleDelete = async () => {
    if (!announcement?.id) return;
    if (confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
      setIsDeleting(true);
      const res = await deleteAnnouncement(announcement.id);
      setIsDeleting(false);
      if (res.ok) {
        onSuccess?.();
      } else {
        alert(res.error || "Gagal menghapus pengumuman");
      }
    }
  };

  const formContent = (
    <>
      {state && "error" in state && state.error && (
        <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>
      )}

      <div>
        <label className="label" htmlFor="title">Judul Pengumuman</label>
        <input
          id="title"
          name="title"
          className="input"
          defaultValue={announcement?.title}
          required
          placeholder="Contoh: Diskon Akhir Pekan 50%!"
        />
      </div>

      <div>
        <label className="label" htmlFor="body">Isi Pengumuman</label>
        <textarea
          id="body"
          name="body"
          rows={4}
          className="input"
          defaultValue={announcement?.body}
          required
          placeholder="Tulis detail promo atau pengumuman di sini..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="type">Tipe</label>
          <select
            id="type"
            name="type"
            className="input"
            defaultValue={announcement?.type ?? "info"}
          >
            <option value="info">Informasi Umum</option>
            <option value="promo">Promosi Spesial</option>
            <option value="discount">Diskon / Potongan Harga</option>
            <option value="release">Rilis Produk Baru</option>
            <option value="warning">Pemberitahuan Penting</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="target_url">Target URL (Opsional)</label>
          <input
            id="target_url"
            name="target_url"
            className="input"
            defaultValue={announcement?.target_url ?? ""}
            placeholder="/cari?q=sayur atau /voucher"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-black/20 text-hijau focus:ring-hijau"
        />
        <input type="hidden" name="is_active" value={String(isActive)} />
        <label className="text-xs font-semibold select-none" htmlFor="is_active">
          Tampilkan ke Pelanggan (Aktif)
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        {inModal && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
        ) : (
          <a
            href="/admin/announcement"
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </a>
        )}
        <button className="btn-utama flex-1" disabled={isPending || isDeleting}>
          {isPending ? "Menyimpan..." : "Simpan Pengumuman"}
        </button>
        {announcement?.id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isPending}
            className="rounded-xl border border-merah px-4 text-xs font-bold text-merah hover:bg-red-50 disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>
    </>
  );

  // In modal mode — no outer card wrapper (modal provides it)
  if (inModal) {
    return (
      <form action={formAction} className="space-y-3">
        {formContent}
      </form>
    );
  }

  // Standalone page mode (kept for backward compat)
  return (
    <div className="space-y-4 max-w-xl">
      <form action={formAction} className="kartu space-y-3 p-5">
        {formContent}
      </form>
    </div>
  );
}
