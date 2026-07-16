"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { saveCategory } from "./actions";

type CategoryData = {
  id?: string;
  name?: string;
  slug?: string;
  icon?: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

type Props = {
  category?: CategoryData | null;
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CategoryForm({ category, inModal, onSuccess, onCancel }: Props) {
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [state, action, pending] = useActionState(saveCategory, null);

  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const formContent = (
    <>
      {category?.id && <input type="hidden" name="id" value={category.id} />}

      <div>
        <label className="label" htmlFor="name">Nama Kategori</label>
        <input id="name" name="name" className="input" defaultValue={category?.name} required placeholder="Contoh: Sayur Segar" />
      </div>

      <div>
        <label className="label" htmlFor="slug">Slug</label>
        <input id="slug" name="slug" className="input font-mono" defaultValue={category?.slug} required placeholder="contoh: sayur-segar" />
        <p className="mt-1 text-[11px] text-tinta/50">Harus unik, tidak boleh pakai spasi.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="icon">Icon (Emoji)</label>
          <input id="icon" name="icon" className="input" defaultValue={category?.icon ?? "🛒"} placeholder="🥬" />
        </div>
        <div>
          <label className="label" htmlFor="sort_order">Urutan</label>
          <input id="sort_order" name="sort_order" type="number" className="input" defaultValue={category?.sort_order ?? 0} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="image_url">URL Gambar (Opsional)</label>
        <input id="image_url" name="image_url" className="input" defaultValue={category?.image_url ?? ""} placeholder="https://..." />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input id="is_active" name="is_active" type="checkbox" value="true" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-black/20 text-hijau focus:ring-hijau" />
        <label className="text-xs font-semibold select-none" htmlFor="is_active">Kategori Aktif</label>
      </div>

      {state && "error" in (state as any) && (state as any).error && (
        <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{(state as any).error}</p>
      )}

      <div className="flex gap-2 pt-2">
        {inModal && onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
        ) : (
          <a href="/admin/kategori" className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</a>
        )}
        <button className="btn-utama flex-1" disabled={pending}>{pending ? "Menyimpan..." : "Simpan Kategori"}</button>
      </div>
    </>
  );

  if (inModal) return <form action={action} className="space-y-3">{formContent}</form>;
  return <form action={action} className="kartu max-w-xl space-y-3 p-5">{formContent}</form>;
}
