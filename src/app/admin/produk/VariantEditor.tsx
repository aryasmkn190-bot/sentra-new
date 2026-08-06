"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { upsertProductVariant, deleteProductVariant } from "@/actions/admin";
import { rupiah } from "@/lib/money";

export type VariantImage = {
  id?: string;
  image_url: string;
  is_primary?: boolean;
  sort_order?: number;
};

export type VariantRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  base_price: number;
  compare_at_price: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  stock_qty?: number;
  images?: VariantImage[];
};

/** Draft untuk form create produk (belum ada id di DB). */
export type DraftVariant = {
  key: string;
  name: string;
  unit: string;
  base_price: string;
  compare_at_price: string;
  stock: string;
  images: string[];
  is_default: boolean;
};

export function emptyDraft(isDefault = false): DraftVariant {
  return {
    key: Math.random().toString(36).slice(2, 9),
    name: isDefault ? "Standar" : "",
    unit: "pcs",
    base_price: "",
    compare_at_price: "",
    stock: "0",
    images: [],
    is_default: isDefault,
  };
}

/** Editor draft saat create produk — tidak hit server. */
export function DraftVariantEditor({
  drafts,
  onChange,
}: {
  drafts: DraftVariant[];
  onChange: (next: DraftVariant[]) => void;
}) {
  const update = (key: string, patch: Partial<DraftVariant>) => {
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };
  const remove = (key: string) => {
    if (drafts.length <= 1) return;
    const next = drafts.filter((d) => d.key !== key);
    if (!next.some((d) => d.is_default)) next[0].is_default = true;
    onChange(next);
  };
  const setDefault = (key: string) => {
    onChange(drafts.map((d) => ({ ...d, is_default: d.key === key })));
  };
  const addImage = (key: string, url: string) => {
    const u = url.trim();
    if (!u) return;
    onChange(
      drafts.map((d) => (d.key === key ? { ...d, images: [...d.images, u] } : d))
    );
  };
  const removeImage = (key: string, idx: number) => {
    onChange(
      drafts.map((d) =>
        d.key === key ? { ...d, images: d.images.filter((_, i) => i !== idx) } : d
      )
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-black/5 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-slate-700">Varian produk</p>
          <p className="text-[10px] text-slate-400">Harga, stok, dan foto per varian</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...drafts, emptyDraft(false)])}
          className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-hijau ring-1 ring-hijau/30 hover:bg-emerald-50"
        >
          + Varian
        </button>
      </div>

      {drafts.map((d, idx) => (
        <div key={d.key} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-700">Varian {idx + 1}</p>
            {drafts.length > 1 && (
              <button type="button" onClick={() => remove(d.key)} className="text-[10px] font-bold text-merah">
                Hapus
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="label">Nama</label>
              <input
                className="input"
                value={d.name}
                onChange={(e) => update(d.key, { name: e.target.value })}
                placeholder="500 g / Pack 12"
                required
              />
            </div>
            <div>
              <label className="label">Satuan</label>
              <input
                className="input"
                value={d.unit}
                onChange={(e) => update(d.key, { unit: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Stok awal</label>
              <input
                type="number"
                min="0"
                className="input"
                value={d.stock}
                onChange={(e) => update(d.key, { stock: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Harga (Rp)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={d.base_price}
                onChange={(e) => update(d.key, { base_price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Harga coret</label>
              <input
                type="number"
                min="0"
                className="input"
                value={d.compare_at_price}
                onChange={(e) => update(d.key, { compare_at_price: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">URL foto (bisa lebih dari 1)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="https://..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage(d.key, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                id={`img-input-${d.key}`}
              />
              <button
                type="button"
                className="rounded-xl border border-hijau/40 px-3 text-[10px] font-bold text-hijau"
                onClick={() => {
                  const el = document.getElementById(`img-input-${d.key}`) as HTMLInputElement | null;
                  if (el) {
                    addImage(d.key, el.value);
                    el.value = "";
                  }
                }}
              >
                + Foto
              </button>
            </div>
            {d.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {d.images.map((url, i) => (
                  <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(d.key, i)}
                      className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <input
              type="radio"
              name="draft_default"
              checked={d.is_default}
              onChange={() => setDefault(d.key)}
            />
            Jadikan default
          </label>
        </div>
      ))}
    </div>
  );
}

/** Editor varian untuk produk yang sudah ada. */
export function VariantEditor({
  productId,
  variants: initial,
  onChanged,
}: {
  productId: string;
  variants: VariantRow[];
  onChanged?: (next?: VariantRow[]) => void;
}) {
  const [variants, setVariants] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<VariantRow | null>(null);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [imgInput, setImgInput] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVariants(initial);
  }, [initial]);

  const openNew = () => {
    setEdit(null);
    setImgUrls([]);
    setImgInput("");
    setShowForm(true);
    setError(null);
  };

  const openEdit = (v: VariantRow) => {
    setEdit(v);
    setImgUrls((v.images ?? []).map((i) => i.image_url));
    setImgInput("");
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEdit(null);
    setError(null);
  };

  const addImg = () => {
    const u = imgInput.trim();
    if (!u) return;
    setImgUrls((arr) => [...arr, u]);
    setImgInput("");
  };

  const save = () => {
    const root = boxRef.current;
    if (!root) return;
    const get = (name: string) => {
      const el = root.querySelector<HTMLInputElement>(`[data-v="${name}"]`);
      return el?.value ?? "";
    };
    const name = get("name").trim();
    const unit = get("unit").trim() || "pcs";
    const base_price = parseInt(get("base_price") || "0", 10);
    const compareRaw = get("compare_at_price").trim();
    const sort_order = parseInt(get("sort_order") || "0", 10) || 0;
    const stock_qty = get("stock_qty").trim();
    const is_default = !!root.querySelector<HTMLInputElement>(`[data-v="is_default"]`)?.checked;
    const is_active = !!root.querySelector<HTMLInputElement>(`[data-v="is_active"]`)?.checked;

    if (!name || !base_price) {
      setError("Nama dan harga wajib diisi.");
      return;
    }

    const fd = new FormData();
    fd.set("product_id", productId);
    if (edit) fd.set("id", edit.id);
    fd.set("name", name);
    fd.set("unit", unit);
    fd.set("base_price", String(base_price));
    if (compareRaw) fd.set("compare_at_price", compareRaw);
    fd.set("sort_order", String(sort_order));
    if (stock_qty !== "") fd.set("stock_qty", stock_qty);
    if (is_default) fd.set("is_default", "1");
    if (is_active) fd.set("is_active", "1");
    else fd.set("is_active", "0");
    fd.set("images_json", JSON.stringify(imgUrls));

    startTransition(async () => {
      const res = await upsertProductVariant(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.variant) {
        let next: VariantRow[];
        if (edit) {
          next = variants.map((v) => (v.id === edit.id ? { ...v, ...res.variant! } : v));
        } else {
          next = [...variants, res.variant as VariantRow];
        }
        if (res.variant.is_default) {
          next = next.map((v) => ({ ...v, is_default: v.id === res.variant!.id }));
        }
        setVariants(next);
        onChanged?.(next);
      } else {
        onChanged?.();
      }
      closeForm();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Nonaktifkan / hapus varian ini?")) return;
    startTransition(async () => {
      const res = await deleteProductVariant(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const next = variants.filter((v) => v.id !== id);
      setVariants(next);
      onChanged?.(next);
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-black/5 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-slate-700">Varian produk</p>
          <p className="text-[10px] text-slate-400">Harga, stok, foto — hanya di sini</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-hijau ring-1 ring-hijau/30 hover:bg-emerald-50"
        >
          + Varian
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-[11px] text-slate-400">Belum ada varian.</p>
      ) : (
        <ul className="space-y-1.5">
          {variants.map((v) => {
            const thumb = v.images?.[0]?.image_url;
            return (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-black/5">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm">📦</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {v.name}
                      {v.is_default && (
                        <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          default
                        </span>
                      )}
                      {!v.is_active && (
                        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                          nonaktif
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {v.sku} · {rupiah(v.base_price)}
                      {typeof v.stock_qty === "number" ? ` · stok ${v.stock_qty}` : ""}
                      {(v.images?.length ?? 0) > 0 ? ` · ${v.images!.length} foto` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openEdit(v)} className="text-[10px] font-bold text-hijau">
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(v.id)}
                    disabled={pending}
                    className="text-[10px] font-bold text-merah"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div ref={boxRef} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-black/5">
          <p className="text-[11px] font-extrabold text-slate-700">
            {edit ? "Ubah varian" : "Varian baru"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="label" htmlFor="v_name">
                Nama
              </label>
              <input
                id="v_name"
                data-v="name"
                className="input"
                defaultValue={edit?.name ?? ""}
                required
                placeholder="500 g"
              />
            </div>
            <div>
              <label className="label">Satuan</label>
              <input data-v="unit" className="input" defaultValue={edit?.unit ?? "pcs"} />
            </div>
            <div>
              <label className="label">Urutan</label>
              <input
                data-v="sort_order"
                type="number"
                className="input"
                defaultValue={edit?.sort_order ?? variants.length}
              />
            </div>
            <div>
              <label className="label">Harga (Rp)</label>
              <input
                data-v="base_price"
                type="number"
                min="1"
                className="input"
                defaultValue={edit?.base_price ?? ""}
                required
              />
            </div>
            <div>
              <label className="label">Harga coret</label>
              <input
                data-v="compare_at_price"
                type="number"
                min="0"
                className="input"
                defaultValue={edit?.compare_at_price ?? ""}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Stok</label>
              <input
                data-v="stock_qty"
                type="number"
                min="0"
                className="input"
                defaultValue={edit?.stock_qty ?? 0}
              />
            </div>
          </div>

          <div>
            <label className="label">Foto varian (URL, multi)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="https://..."
                value={imgInput}
                onChange={(e) => setImgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImg();
                  }
                }}
              />
              <button
                type="button"
                onClick={addImg}
                className="rounded-xl border border-hijau/40 px-3 text-[10px] font-bold text-hijau"
              >
                + Foto
              </button>
            </div>
            {imgUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {imgUrls.map((url, i) => (
                  <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImgUrls((arr) => arr.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" data-v="is_default" defaultChecked={edit?.is_default ?? false} />
              Jadikan default
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" data-v="is_active" defaultChecked={edit?.is_active ?? true} />
              Aktif di storefront
            </label>
          </div>
          {error && <p className="text-[11px] font-semibold text-merah">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-600"
            >
              Batal
            </button>
            <button type="button" disabled={pending} onClick={save} className="btn-utama flex-1 !py-1.5 text-[11px]">
              {pending ? "Menyimpan..." : "Simpan varian"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
