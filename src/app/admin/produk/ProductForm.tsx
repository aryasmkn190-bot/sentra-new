"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertProduct } from "@/actions/admin";
import {
  VariantEditor,
  DraftVariantEditor,
  emptyDraft,
  type VariantRow,
  type DraftVariant,
} from "./VariantEditor";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  category_id: string;
  description: string | null;
  max_qty_per_order: number;
  status: string;
  variants?: VariantRow[];
};

export function ProductForm({
  categories,
  product,
  onSuccess,
}: {
  categories: Category[];
  product?: Product | null;
  onSuccess?: () => void;
}) {
  const isEdit = !!product?.id;
  const [state, action, pending] = useActionState(upsertProduct, null);
  const [variants, setVariants] = useState<VariantRow[]>(product?.variants ?? []);
  const [drafts, setDrafts] = useState<DraftVariant[]>([emptyDraft(true)]);

  useEffect(() => {
    if (product?.variants) setVariants(product.variants);
  }, [product?.variants]);

  useEffect(() => {
    if (state && "ok" in state && state.ok) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      {!isEdit && (
        <input
          type="hidden"
          name="variants_json"
          value={JSON.stringify(
            drafts.map((d) => ({
              name: d.name,
              unit: d.unit,
              base_price: parseInt(d.base_price || "0", 10) || 0,
              compare_at_price: d.compare_at_price
                ? parseInt(d.compare_at_price, 10)
                : null,
              stock: parseInt(d.stock || "0", 10) || 0,
              images: d.images,
              is_default: d.is_default,
            }))
          )}
        />
      )}

      <div>
        <label className="label" htmlFor="name">
          Nama Produk
        </label>
        <input
          id="name"
          name="name"
          className="input"
          defaultValue={product?.name ?? ""}
          required
          placeholder="Air Mineral 600ml"
        />
      </div>

      <div>
        <label className="label" htmlFor="category_id">
          Kategori
        </label>
        <select
          id="category_id"
          name="category_id"
          className="input"
          defaultValue={product?.category_id ?? ""}
          required
        >
          <option value="" disabled>
            Pilih kategori
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Deskripsi
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-[88px]"
          defaultValue={product?.description ?? ""}
          placeholder="Deskripsi singkat produk"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="max_qty_per_order">
            Maks Order
          </label>
          <input
            id="max_qty_per_order"
            name="max_qty_per_order"
            type="number"
            min="1"
            className="input"
            defaultValue={product?.max_qty_per_order ?? 10}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="input"
            defaultValue={product?.status ?? "active"}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {isEdit ? (
        <VariantEditor
          productId={product!.id}
          variants={variants}
          onChanged={(next) => {
            if (next) setVariants(next);
          }}
        />
      ) : (
        <DraftVariantEditor drafts={drafts} onChange={setDrafts} />
      )}

      {state && "error" in state && state.error && (
        <p className="text-xs font-semibold text-merah">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-utama w-full">
        {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
      </button>
    </form>
  );
}
