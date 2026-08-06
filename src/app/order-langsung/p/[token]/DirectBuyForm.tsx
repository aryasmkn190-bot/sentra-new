"use client";

import { useActionState, useState } from "react";
import { placeDirectOrder } from "@/actions/direct-order";
import { rupiah } from "@/lib/money";

export function DirectBuyForm({
  token,
  price,
  maxQty,
}: {
  token: string;
  price: number;
  maxQty: number;
}) {
  const [qty, setQty] = useState(1);
  const [state, action, pending] = useActionState(placeDirectOrder, null);
  const cap = Math.min(99, Math.max(1, maxQty));
  const total = price * qty;

  return (
    <form action={action} className="kartu space-y-4 p-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="qty" value={qty} />

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600">Jumlah</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-extrabold tabular-nums">{qty}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold"
            onClick={() => setQty((q) => Math.min(cap, q + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 pt-3">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-extrabold tabular-nums text-[#A00000]">{rupiah(total)}</span>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-merah">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="btn-utama w-full shadow-lg shadow-brand/30">
        {pending ? "Menyiapkan pembayaran…" : "Bayar sekarang"}
      </button>
      <p className="text-center text-[11px] text-slate-400">
        Perlu login. Setelah lunas, tunjukkan bukti ke petugas — tanpa antar.
      </p>
    </form>
  );
}
