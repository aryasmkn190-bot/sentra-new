"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getProductStockRows, setProductPrices } from "@/actions/admin";

type PriceVariant = {
  id: string;
  sku: string;
  name: string;
  base_price: number;
};

type Props = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function PriceModal({ open, productId, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [variants, setVariants] = useState<PriceVariant[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
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
      setError("Gagal memuat harga.");
      setLoading(false);
      return;
    }
    setName(data.name);
    setVariants(
      data.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        base_price: v.base_price,
      }))
    );
    const map: Record<string, string> = {};
    for (const v of data.variants) map[v.id] = String(v.base_price || "");
    setPrices(map);
    setBulk("");
    setLoading(false);
  };

  const applyBulk = () => {
    const n = parseInt(bulk, 10);
    if (!n || n <= 0) return;
    const map: Record<string, string> = {};
    for (const v of variants) map[v.id] = String(n);
    setPrices(map);
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
      const p = prices[v.id];
      if (p === undefined || p === "") continue;
      fd.set(`price_${v.id}`, p);
    }
    startTransition(async () => {
      const res = await setProductPrices(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      handleClose();
      onSuccess();
    });
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-center open:justify-center"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-black/5 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Atur Harga</h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{name || "…"}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Memuat...</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                <div className="min-w-[100px]">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Ubah Massal
                  </p>
                  <span className="text-xs font-semibold text-slate-600">Harga</span>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1"
                    className="input pl-8"
                    placeholder="Harga"
                    value={bulk}
                    onChange={(e) => setBulk(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulk}
                  className="rounded-xl border border-orange-400 bg-white px-3 py-2 text-[11px] font-bold text-orange-600 hover:bg-orange-50"
                >
                  Terapkan Ke Semua
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-2">Variasi</th>
                    <th className="pb-2 text-right">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-b border-black/5 last:border-0">
                      <td className="py-3 pr-2">
                        <p className="text-xs font-bold text-slate-800">{v.name}</p>
                        <p className="text-[10px] text-slate-400">SKU: {v.sku || "-"}</p>
                      </td>
                      <td className="py-3 text-right">
                        <div className="relative ml-auto w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="number"
                            min="1"
                            className="input py-1.5 pl-7 text-right text-xs font-bold"
                            value={prices[v.id] ?? ""}
                            onChange={(e) =>
                              setPrices((m) => ({ ...m, [v.id]: e.target.value }))
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {error && <p className="mt-3 text-xs font-semibold text-merah">{error}</p>}
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
            className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Update Harga"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
