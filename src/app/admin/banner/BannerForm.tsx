"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { upsertBanner, deleteBanner } from "@/actions/admin";

type BannerData = {
  id?: string; title?: string; image_url?: string; target_url?: string;
  placement?: string; sort_order?: number; start_at?: Date; end_at?: Date; is_active?: boolean;
};

type Props = {
  banner?: BannerData | null;
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function BannerForm({ banner, inModal, onSuccess, onCancel }: Props) {
  const [state, action, pending] = useActionState(upsertBanner, null);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (date?: Date) => {
    if (!date) return "";
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const handleDelete = async () => {
    if (!banner?.id) return;
    if (confirm("Apakah Anda yakin ingin menghapus banner ini?")) {
      setIsDeleting(true);
      const res = await deleteBanner(banner.id);
      setIsDeleting(false);
      if (res.ok) onSuccess?.();
      else alert(res.error || "Gagal menghapus banner");
    }
  };

  const formContent = (
    <>
      {banner?.id && <input type="hidden" name="id" value={banner.id} />}
      <input type="hidden" name="is_active" value={String(isActive)} />

      <div>
        <label className="label" htmlFor="title">Judul Banner</label>
        <input id="title" name="title" className="input" defaultValue={banner?.title} required placeholder="Contoh: Diskon Sayur 50%" />
      </div>
      <div>
        <label className="label" htmlFor="image_url">URL Gambar Banner</label>
        <input id="image_url" name="image_url" className="input" defaultValue={banner?.image_url} placeholder="https://..." />
      </div>
      <div>
        <label className="label" htmlFor="target_url">Tautan Target (URL)</label>
        <input id="target_url" name="target_url" className="input" defaultValue={banner?.target_url ?? "/"} placeholder="/cari?q=promo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="placement">Penempatan</label>
          <select id="placement" name="placement" className="input" defaultValue={banner?.placement ?? "home_top"}>
            <option value="home_top">Atas Beranda</option>
            <option value="home_mid">Tengah Beranda</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort_order">Urutan Tampilan</label>
          <input id="sort_order" name="sort_order" type="number" className="input" defaultValue={banner?.sort_order ?? 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="start_at">Mulai Tayang</label><input id="start_at" name="start_at" type="datetime-local" className="input" defaultValue={formatDate(banner?.start_at)} required /></div>
        <div><label className="label" htmlFor="end_at">Selesai Tayang</label><input id="end_at" name="end_at" type="datetime-local" className="input" defaultValue={formatDate(banner?.end_at)} required /></div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input id="is_active_cb" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-black/20 text-hijau focus:ring-hijau" />
        <label className="text-xs font-semibold select-none" htmlFor="is_active_cb">Aktifkan banner ini</label>
      </div>

      {state && "error" in state && state.error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>}

      <div className="flex gap-2 pt-2">
        {banner?.id && (
          <button type="button" onClick={handleDelete} disabled={isDeleting || pending} className="rounded-xl border border-merah px-4 text-xs font-bold text-merah hover:bg-red-50 disabled:opacity-50">Hapus</button>
        )}
        {inModal && onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
        ) : (
          <a href="/admin/banner" className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</a>
        )}
        <button className="btn-utama flex-1" disabled={pending || isDeleting}>{pending ? "Menyimpan..." : "Simpan Banner"}</button>
      </div>
    </>
  );

  if (inModal) return <form action={action} className="space-y-3">{formContent}</form>;
  return <div className="space-y-4 max-w-xl"><form action={action} className="kartu space-y-3 p-5">{formContent}</form></div>;
}
