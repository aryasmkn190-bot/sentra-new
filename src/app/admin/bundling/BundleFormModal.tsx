"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upsertBundle } from "@/actions/bundle";
import { rupiah } from "@/lib/money";

type ProductOption = {
  id: string;
  name: string;
  base_price: number;
  variants: {
    id: string;
    name: string;
    base_price: number;
  }[];
};

type BundleItemEntry = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  price: number;
  qty: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bundle: any | null;
  products: ProductOption[];
};

export function BundleFormModal({
  isOpen,
  onClose,
  onSuccess,
  bundle,
  products,
}: Props) {
  const [state, formAction, pending] = useActionState(upsertBundle, null);
  const successCalled = useRef(false);

  // Form states
  const [name, setName] = useState(bundle?.name || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [price, setPrice] = useState(bundle?.price ? String(bundle.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    bundle?.compare_at_price ? String(bundle.compare_at_price) : ""
  );
  const [imageUrl, setImageUrl] = useState(bundle?.image_url || "");
  const [isActive, setIsActive] = useState(bundle?.is_active ?? true);

  // Items in bundle
  const [items, setItems] = useState<BundleItemEntry[]>(() => {
    if (bundle?.items) {
      return bundle.items.map((i: any) => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        product_name: i.product?.name || "Produk",
        variant_name: i.variant?.name || null,
        price: i.variant?.base_price || i.product?.base_price || 0,
        qty: i.qty || 1,
      }));
    }
    return [];
  });

  // Builder row
  const [selectedProdId, setSelectedProdId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [itemQty, setItemQty] = useState(1);

  useEffect(() => {
    if (state && "ok" in state && state.ok && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => {
        onSuccess();
      }, 100);
    }
  }, [state, onSuccess]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProdId);
  const currentVariants = currentProduct?.variants || [];

  const handleAddItem = () => {
    if (!currentProduct) return;
    const targetVariant = currentVariants.find((v) => v.id === selectedVariantId);
    const itemPrice = targetVariant?.base_price || currentProduct.base_price;

    setItems((prev) => [
      ...prev,
      {
        product_id: currentProduct.id,
        variant_id: targetVariant?.id || null,
        product_name: currentProduct.name,
        variant_name: targetVariant?.name || null,
        price: itemPrice,
        qty: Math.max(1, itemQty),
      },
    ]);

    setSelectedProdId("");
    setSelectedVariantId("");
    setItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const normalSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {bundle ? "Edit Paket Bundling" : "Tambah Paket Bundling Baru"}
            </h2>
            <p className="text-xs text-slate-500">
              Paket bundling mengkonsumsi stok satuan dari masing-masing produk penyusunnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {bundle && <input type="hidden" name="id" value={bundle.id} />}
          <input
            type="hidden"
            name="items_json"
            value={JSON.stringify(
              items.map((i) => ({
                product_id: i.product_id,
                variant_id: i.variant_id,
                qty: i.qty,
              }))
            )}
          />

          {state?.error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-merah">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nama Paket</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Paket A / Paket Hemat Kebersihan"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">URL Gambar (Opsional)</label>
              <input
                type="text"
                name="image_url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Deskripsi Paket</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Deskripsi singkat isi paket atau manfaat bundling..."
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Harga Paket (Rp)</label>
              <input
                type="number"
                name="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={normalSubtotal > 0 ? String(normalSubtotal) : "50000"}
                required
                className="input font-bold"
              />
              {normalSubtotal > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Total harga satuan normal:{" "}
                  <b className="text-slate-800">{rupiah(normalSubtotal)}</b>
                </p>
              )}
            </div>
            <div>
              <label className="label">Harga Coret / Banding (Opsional)</label>
              <input
                type="number"
                name="compare_at_price"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder={normalSubtotal > 0 ? String(normalSubtotal) : ""}
                className="input"
              />
            </div>
          </div>

          {/* Builder Komponen Produk Satuan */}
          <div className="rounded-2xl border border-black/10 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Komponen Produk Satuan ({items.length} jenis produk)
              </p>
              <span className="text-[10px] text-slate-400">
                Stok paket akan terpotong dari stok produk satuan ini
              </span>
            </div>

            {/* Input Picker Baris */}
            <div className="grid grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-black/5">
              <div className="col-span-6">
                <label className="text-[10px] font-bold text-slate-400">Pilih Produk</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => {
                    setSelectedProdId(e.target.value);
                    setSelectedVariantId("");
                  }}
                  className="input !py-1.5 !text-xs"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({rupiah(p.base_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="text-[10px] font-bold text-slate-400">Varian</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={currentVariants.length <= 1}
                  className="input !py-1.5 !text-xs"
                >
                  {currentVariants.length <= 1 ? (
                    <option value="">Standar</option>
                  ) : (
                    <>
                      <option value="">Pilih Varian</option>
                      {currentVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({rupiah(v.base_price)})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400">Jumlah (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 1)}
                  className="input !py-1.5 !text-xs"
                />
              </div>

              <div className="col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProdId}
                  className="btn-utama !py-1.5 !px-2 w-full text-center text-xs disabled:opacity-40"
                  title="Tambah ke paket"
                >
                  +
                </button>
              </div>
            </div>

            {/* Tabel Isi Komponen */}
            {items.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-400">
                Belum ada produk satuan yang ditambahkan ke paket ini.
              </p>
            ) : (
              <div className="divide-y divide-black/5 border border-black/5 rounded-xl bg-white overflow-hidden text-xs">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5">
                    <div>
                      <span className="font-bold text-slate-800">{item.product_name}</span>
                      {item.variant_name && item.variant_name !== "Standar" && (
                        <span className="text-slate-400 ml-1">({item.variant_name})</span>
                      )}
                      <span className="ml-2 font-extrabold text-[#A00000]">
                        × {item.qty} pcs
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold text-slate-500">
                        {rupiah(item.price * item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 font-extrabold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-black/5 pt-3">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktifkan Paket (Bisa dibeli user)
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-garis !py-2 !px-4 text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending || items.length === 0}
                className="btn-utama !py-2 !px-5 text-xs shadow-md"
              >
                {pending ? "Menyimpan…" : "Simpan Paket"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
