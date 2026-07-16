"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { upsertProduct } from "@/actions/admin";

type CategoryOpt = { id: string; name: string };
type ProductData = {
  id?: string;
  name?: string;
  category_id?: string;
  base_price?: number;
  compare_at_price?: number | null;
  unit?: string;
  description?: string;
  max_qty_per_order?: number;
  status?: string;
  image_url?: string;
};

type Props = {
  categories: CategoryOpt[];
  product?: ProductData | null;
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ProductForm({ categories, product, inModal, onSuccess, onCancel }: Props) {
  const [state, action, pending] = useActionState(upsertProduct, null);

  // Call onSuccess when submission succeeds
  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const formContent = (
    <>
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div>
        <label className="label" htmlFor="name">Nama produk</label>
        <input id="name" name="name" className="input" defaultValue={product?.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="category_id">Kategori</label>
          <select id="category_id" name="category_id" className="input" defaultValue={product?.category_id} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="unit">Satuan</label>
          <input id="unit" name="unit" className="input" defaultValue={product?.unit ?? "pcs"} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="base_price">Harga (Rp)</label>
          <input id="base_price" name="base_price" type="number" min="0" className="input" defaultValue={product?.base_price} required />
        </div>
        <div>
          <label className="label" htmlFor="compare_at_price">Harga coret (opsional)</label>
          <input id="compare_at_price" name="compare_at_price" type="number" min="0" className="input" defaultValue={product?.compare_at_price ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Deskripsi</label>
        <textarea id="description" name="description" className="input" rows={3} defaultValue={product?.description} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="max_qty_per_order">Maks. qty per order</label>
          <input id="max_qty_per_order" name="max_qty_per_order" type="number" min="1" className="input" defaultValue={product?.max_qty_per_order ?? 10} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={product?.status ?? "active"}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="archived">Arsip</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="image_url">URL Gambar Utama</label>
        <input id="image_url" name="image_url" className="input" placeholder="https://..." defaultValue={product?.image_url} />
      </div>
      {state && "error" in state && state.error && (
        <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>
      )}

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
            href="/admin/produk"
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </a>
        )}
        <button className="btn-utama flex-1" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan produk"}
        </button>
      </div>
    </>
  );

  if (inModal) {
    return <form action={action} className="space-y-3">{formContent}</form>;
  }

  return (
    <form action={action} className="kartu max-w-xl space-y-3 p-5">
      {formContent}
    </form>
  );
}
