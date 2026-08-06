"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getProductStockRows, setProductStocks } from "@/actions/admin";

type StockVariant = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  base_price: number;
  is_active: boolean;
  stock_qty: number;
  reserved_qty: number;
  available: number;
};

type Props = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function StockModal({ open, productId, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [variants, setVariants] = useState<StockVariant[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      if (productId) load(productId);
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [open, productId]);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    const data = await getProductStockRows(id);
    if (!data) {
      setError("Gagal memuat stok.");
      setLoading(false);
      return;
    }
    setName(data.name);
    setVariants(data.variants);
    const map: Record<string, string> = {};
    for (const v of data.variants) map[v.id] = String(v.stock_qty);
    setQty(map);
    setBulk("");
    setLoading(false);
  };

  const applyBulk = () => {
    if (bulk.trim() === "") return;
    const n = Math.max(0, parseInt(bulk, 10) || 0);
    const map: Record<string, string> = {};
    for (const v of variants) map[v.id] = String(n);
    setQty(map);
  };

  const handleClose = () => {
    document.body.style.overflow = "";
    onClose();
  };

  const submit = () => {
    if (!productId) return;
    const fd = new FormData();
    fd.set("product_id", productId);
    for (const v of variants) {
      fd.set(`stock_${v.id}`, qty[v.id] ?? "0");
    }
    startTransition(async () => {
      const res = await setProductStocks(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    });
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-800">Atur Stok</h2>
            <p className="truncate text-[11px] font-medium text-slate-500">{name}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[65dvh] overflow-y-auto p-5 space-y-4">
          {/* Ubah massal — pola Shopee */}
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-black/5">
            <div className="min-w-[100px] flex-1">
              <label className="label">Ubah massal</label>
              <input
                type="number"
                min="0"
                className="input"
                placeholder="Stok"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={applyBulk}
              className="rounded-xl border border-hijau/40 bg-white px-3 py-2 text-[11px] font-bold text-hijau hover:bg-emerald-50"
            >
              Terapkan ke semua
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : variants.length === 0 ? (
            <p className="text-center text-xs text-slate-400">Belum ada varian.</p>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left font-bold text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Variasi</th>
                    <th className="px-3 py-2.5 w-28 text-right">Total Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {variants.map((v) => (
                    <tr key={v.id} className={!v.is_active ? "opacity-50" : ""}>
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-800">{v.name}</p>
                        <p className="text-[10px] text-slate-400">
                          SKU: {v.sku}
                          {v.reserved_qty > 0 ? ` · reservasi ${v.reserved_qty}` : ""}
                          {!v.is_active ? " · nonaktif" : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          className="input !py-1.5 text-right tabular-nums"
                          value={qty[v.id] ?? "0"}
                          onChange={(e) => setQty((m) => ({ ...m, [v.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <p className="text-[11px] font-semibold text-merah">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-black/5 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending || loading}
            onClick={submit}
            className="btn-utama !px-5 !py-2 text-xs"
          >
            {pending ? "Menyimpan..." : "Update"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
