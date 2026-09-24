"use client";

import { useState, useTransition } from "react";
import { addItemToPendingDirectOrder } from "@/actions/direct-order";
import { rupiah } from "@/lib/money";

type DirectProd = {
  id: string;
  name: string;
  price: number;
  available: number;
  image_url?: string | null;
};

export function AddDirectProductModal({
  orderId,
  availableProducts,
}: {
  orderId: string;
  availableProducts: DirectProd[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedProd = availableProducts.find((p) => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError("Pilih produk terlebih dahulu.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addItemToPendingDirectOrder(orderId, selectedProductId, qty);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setSelectedProductId("");
      setQty(1);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-[#A00000]/40 bg-[#FDF0F0] py-3 text-center text-xs font-extrabold text-[#A00000] hover:bg-[#FBE0E0] transition"
      >
        + Tambah Produk ke Pesanan Ini (Cukup 1x QRIS)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Tambah Produk Langsung
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total tagihan akan diperbarui otomatis ke 1 kode QRIS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="label">Pilih Produk Order Langsung</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setQty(1);
                  }}
                  required
                  className="input"
                >
                  <option value="">-- Pilih produk dari rak Hub PTO --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.available <= 0}>
                      {p.name} · {rupiah(p.price)} {p.available <= 0 ? "(Habis)" : `(Sisa ${p.available})`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProd && (
                <div className="rounded-xl bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedProd.name}</p>
                      <p className="text-xs font-extrabold text-[#A00000]">
                        {rupiah(selectedProd.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-extrabold">{qty}</span>
                      <button
                        type="button"
                        disabled={qty >= selectedProd.available}
                        onClick={() => setQty((q) => Math.min(selectedProd.available, q + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm text-sm font-bold disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-black/5 pt-2 text-xs">
                    <span className="text-slate-500">Subtotal Tambahan:</span>
                    <span className="font-extrabold text-slate-900">
                      {rupiah(selectedProd.price * qty)}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-merah">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-garis flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending || !selectedProductId}
                  className="btn-utama flex-1"
                >
                  {pending ? "Menambahkan…" : "Tambah ke Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
