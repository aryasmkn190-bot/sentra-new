"use client";

import { useTransition } from "react";
import { setItemFulfillment } from "@/actions/partner";

export function ItemRow({
  itemId,
  name,
  rack,
  qtyOrdered,
  qtyFulfilled,
}: {
  itemId: string;
  name: string;
  rack: string;
  qtyOrdered: number;
  qtyFulfilled: number;
}) {
  const [pending, startTransition] = useTransition();
  const done = qtyFulfilled === qtyOrdered;
  const oos = qtyFulfilled === 0;

  return (
    <div className={`flex items-center gap-3 p-3 ${done ? "bg-hijau-muda/50" : ""}`}>
      <span className="rounded-lg bg-tinta px-2 py-1 text-xs font-extrabold text-kilat tabular-nums">{rack || "—"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{name}</p>
        <p className="text-xs text-tinta/60">
          Ambil <b>{qtyOrdered}</b> · terpenuhi {qtyFulfilled}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          disabled={pending || done}
          onClick={() => startTransition(() => setItemFulfillment(itemId, qtyOrdered).then(() => {}))}
          className="rounded-lg bg-hijau px-3 py-2 text-xs font-bold text-white disabled:opacity-30"
        >
          ✓ Lengkap
        </button>
        <button
          disabled={pending || oos}
          onClick={() => startTransition(() => setItemFulfillment(itemId, 0).then(() => {}))}
          className="rounded-lg border border-merah px-3 py-2 text-xs font-bold text-merah disabled:opacity-30"
        >
          Habis
        </button>
      </div>
    </div>
  );
}
