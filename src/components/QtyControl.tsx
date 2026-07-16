"use client";

import { useState, useTransition } from "react";
import { setCartQty } from "@/actions/cart";

export function QtyControl({
  productId,
  initialQty,
  maxQty,
  compact = false,
}: {
  productId: string;
  initialQty: number;
  maxQty: number;
  compact?: boolean;
}) {
  const [qty, setQty] = useState(initialQty);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const update = (next: number) => {
    const clamped = Math.max(0, Math.min(next, maxQty));
    setQty(clamped);
    setError(null);
    startTransition(async () => {
      const res = await setCartQty(productId, clamped);
      if (res?.error) {
        setError(res.error);
        setQty(qty);
      }
    });
  };

  if (qty === 0) {
    return (
      <div>
        <button
          onClick={() => update(1)}
          disabled={pending || maxQty === 0}
          className={`btn-utama ${compact ? "!px-3 !py-1.5 !text-xs" : "!py-2"} w-full`}
          aria-label="Tambah ke keranjang"
        >
          {maxQty === 0 ? "Stok Habis" : "+ Tambah"}
        </button>
        {error && <p className="mt-1 text-[11px] text-merah">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-center justify-between rounded-xl border border-hijau bg-hijau-muda ${compact ? "px-1 py-0.5" : "px-2 py-1"}`}>
        <button
          onClick={() => update(qty - 1)}
          disabled={pending}
          className="h-8 w-8 rounded-lg text-lg font-bold text-hijau hover:bg-white"
          aria-label="Kurangi"
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
        <button
          onClick={() => update(qty + 1)}
          disabled={pending || qty >= maxQty}
          className="h-8 w-8 rounded-lg text-lg font-bold text-hijau hover:bg-white disabled:opacity-30"
          aria-label="Tambah"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-merah">{error}</p>}
    </div>
  );
}
