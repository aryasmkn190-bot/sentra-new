"use client";

import { useMemo, useState } from "react";
import { Price } from "@/components/Price";
import { QtyControl } from "@/components/QtyControl";
import { rupiah } from "@/lib/money";

export type StoreVariant = {
  id: string;
  name: string;
  unit: string;
  price: number;
  compareAt: number | null;
  available: number;
  inCartQty: number;
  isDefault: boolean;
  images?: string[];
};

export function ProductBuyBox({
  productName,
  maxPerOrder,
  variants,
  fallbackImage,
  categoryIcon,
}: {
  productName: string;
  maxPerOrder: number;
  variants: StoreVariant[];
  fallbackImage?: string | null;
  categoryIcon?: string;
}) {
  const initial =
    variants.find((v) => v.isDefault && v.available > 0) ||
    variants.find((v) => v.available > 0) ||
    variants[0];

  const [selectedId, setSelectedId] = useState(initial?.id ?? "");
  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId]
  );

  if (!selected) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-merah">
        Varian belum tersedia
      </p>
    );
  }

  const multi = variants.length > 1;
  const hero = selected.images?.[0] || fallbackImage || null;

  return (
    <div className="space-y-3">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-hijau-muda">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={productName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-8xl" aria-hidden>
            {categoryIcon || "🛒"}
          </span>
        )}
      </div>

      {selected.images && selected.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {selected.images.map((url, i) => (
            <button
              key={i}
              type="button"
              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10"
              onClick={() => {
                /* hero already uses images[0]; multi-photo view is display only for now */
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {multi && (
        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">Pilih varian</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = v.id === selected.id;
              const disabled = v.available <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedId(v.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                    active
                      ? "border-[#A00000] bg-[#FDF0F0] text-[#A00000]"
                      : disabled
                        ? "border-black/5 bg-slate-50 text-slate-300 line-through"
                        : "border-black/10 bg-white text-slate-700 hover:border-[#A00000]/40"
                  }`}
                >
                  <span className="block">{v.name}</span>
                  <span
                    className={`block text-[10px] ${
                      active ? "text-[#A00000]/80" : "text-slate-400"
                    }`}
                  >
                    {rupiah(v.price)}
                    {disabled ? " · Habis" : v.available <= 5 ? ` · Sisa ${v.available}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Price amount={selected.price} compareAt={selected.compareAt} size="lg" />

      <QtyControl
        key={selected.id}
        variantId={selected.id}
        initialQty={selected.inCartQty}
        maxQty={Math.min(selected.available, maxPerOrder)}
      />
    </div>
  );
}
