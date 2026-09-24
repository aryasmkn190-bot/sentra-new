"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { placeDirectOrder } from "@/actions/direct-order";
import { rupiah } from "@/lib/money";

type DirectItem = {
  id: string;
  name: string;
  price: number;
  available: number;
  qr_token: string;
  image_url?: string | null;
  category?: string;
};

export function DirectBuyForm({
  currentProduct,
  otherProducts = [],
}: {
  currentProduct: DirectItem;
  otherProducts?: DirectItem[];
}) {
  // Keranjang produk langsung: map dari productId -> qty
  const [basket, setBasket] = useState<Record<string, number>>({
    [currentProduct.id]: 1,
  });

  const [showOther, setShowOther] = useState(false);
  const [state, action, pending] = useActionState(placeDirectOrder, null);

  // Ambil semua produk yang ada di basket
  const allProductsMap = new Map<string, DirectItem>();
  allProductsMap.set(currentProduct.id, currentProduct);
  for (const p of otherProducts) {
    allProductsMap.set(p.id, p);
  }

  const basketEntries = Object.entries(basket)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const prod = allProductsMap.get(id);
      return {
        id,
        name: prod?.name || "Produk",
        price: prod?.price || 0,
        qty,
        subtotal: (prod?.price || 0) * qty,
        available: prod?.available || 99,
      };
    });

  const totalAmount = basketEntries.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemsCount = basketEntries.reduce((sum, item) => sum + item.qty, 0);

  const updateQty = (id: string, delta: number, max: number) => {
    setBasket((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === 0 && id === currentProduct.id && basketEntries.length === 1) {
        // Jangan biarkan 0 jika hanya 1 produk yang tersisa
        return { ...prev, [id]: 1 };
      }
      return { ...prev, [id]: next };
    });
  };

  const itemsJson = JSON.stringify(
    basketEntries.map((i) => ({ id: i.id, qty: i.qty }))
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="items_json" value={itemsJson} />
      <input type="hidden" name="token" value={currentProduct.qr_token} />

      {/* Bagian Ringkasan Keranjang Order Langsung */}
      <div className="kartu divide-y divide-black/5 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Daftar Pesanan Langsung ({totalItemsCount} item)
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            1x Pembayaran QRIS
          </span>
        </div>

        {basketEntries.map((item) => (
          <div key={item.id} className="flex items-center justify-between pt-3">
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</p>
              <p className="text-[11px] text-slate-400">
                {rupiah(item.price)} × {item.qty}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200"
                onClick={() => updateQty(item.id, -1, item.available)}
              >
                −
              </button>
              <span className="w-6 text-center text-xs font-extrabold tabular-nums">
                {item.qty}
              </span>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                disabled={item.qty >= item.available}
                onClick={() => updateQty(item.id, 1, item.available)}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3">
          <span className="text-sm font-bold text-slate-600">Total Tagihan</span>
          <span className="text-lg font-extrabold tabular-nums text-[#A00000]">
            {rupiah(totalAmount)}
          </span>
        </div>
      </div>

      {/* Accordion / Drawer: Tambah Produk Langsung Lainnya */}
      {otherProducts.length > 0 && (
        <div className="kartu overflow-hidden p-4">
          <button
            type="button"
            onClick={() => setShowOther(!showOther)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-extrabold text-slate-900">
                + Tambah Produk Order Langsung Lainnya
              </p>
              <p className="text-[11px] text-slate-500">
                Bisa tambah produk lain di Hub PTO tanpa perlu scan QRIS ulang
              </p>
            </div>
            <span
              className={`text-sm font-bold text-[#A00000] transition-transform ${
                showOther ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {showOther && (
            <div className="mt-4 divide-y divide-black/5 border-t border-black/5 pt-2 space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Produk di Hub PTO Bandung
                </span>
                <Link
                  href="/order-langsung"
                  className="text-[11px] font-bold text-[#A00000] hover:underline"
                >
                  📷 Scan Barcode Lain
                </Link>
              </div>

              {otherProducts.map((p) => {
                const currentQty = basket[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base">📦</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</p>
                        <p className="text-[11px] font-semibold text-[#A00000] tabular-nums">
                          {rupiah(p.price)}
                          <span className="ml-1 text-[10px] text-slate-400 font-normal">
                            (stok: {p.available})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      {currentQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQty(p.id, 1, p.available)}
                          disabled={p.available <= 0}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-extrabold text-[#A00000] hover:bg-[#FDF0F0] disabled:opacity-40"
                        >
                          + Tambah
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold"
                            onClick={() => updateQty(p.id, -1, p.available)}
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-xs font-extrabold">{currentQty}</span>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold disabled:opacity-40"
                            disabled={currentQty >= p.available}
                            onClick={() => updateQty(p.id, 1, p.available)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {state?.error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-merah">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || totalAmount <= 0}
        className="btn-utama w-full shadow-lg shadow-brand/30 !py-3 !text-sm"
      >
        {pending ? "Menyiapkan pembayaran…" : `Bayar Sekarang (${rupiah(totalAmount)})`}
      </button>

      <p className="text-center text-[11px] text-slate-400">
        1x scan QRIS untuk semua barang di atas. Setelah lunas, tunjukkan bukti ke petugas gudang.
      </p>
    </form>
  );
}
