"use client";

import { useState, useTransition } from "react";
import { setBundleCartQty } from "@/actions/cart";

export function BundleQtyControl({
  bundleId,
  initialQty,
  maxQty = 10,
  compact = false,
}: {
  bundleId: string;
  initialQty: number;
  maxQty?: number;
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
      const res = await setBundleCartQty(bundleId, clamped);
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
          disabled={pending || maxQty === 0 || !bundleId}
          className={`inline-flex w-full items-center justify-center rounded-xl bg-[#A00000] font-bold text-white transition hover:bg-[#800000] disabled:opacity-40 ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          }`}
          aria-label="Tambah paket ke keranjang"
        >
          {maxQty === 0 ? "Stok Habis" : "+ Beli Paket"}
        </button>
        {error && <p className="mt-1 text-[11px] text-merah">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-xl border border-[#A00000]/25 bg-[#FDF0F0] ${
          compact ? "px-1 py-0.5" : "px-2 py-1"
        }`}
      >
        <button
          onClick={() => update(qty - 1)}
          disabled={pending}
          className="h-8 w-8 rounded-lg text-lg font-bold text-[#A00000] hover:bg-white"
          aria-label="Kurangi"
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm font-bold tabular-nums text-slate-900">{qty}</span>
        <button
          onClick={() => update(qty + 1)}
          disabled={pending || qty >= maxQty}
          className="h-8 w-8 rounded-lg text-lg font-bold text-[#A00000] hover:bg-white disabled:opacity-30"
          aria-label="Tambah"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-merah">{error}</p>}
    </div>
  );
}
