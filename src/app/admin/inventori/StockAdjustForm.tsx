"use client";

import { useActionState } from "react";
import { adjustStock } from "@/actions/admin";

export function StockAdjustForm({ hubStockId }: { hubStockId: string }) {
  const [state, action, pending] = useActionState(adjustStock, null);
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="hub_stock_id" value={hubStockId} />
      <input name="delta" type="number" className="input !w-20 !px-2 !py-1.5 text-xs" placeholder="±qty" required />
      <input name="note" className="input !w-28 !px-2 !py-1.5 text-xs" placeholder="catatan" />
      <button className="btn-utama !px-3 !py-1.5 !text-xs" disabled={pending}>{pending ? "…" : "Sesuaikan"}</button>
      {state?.error && <span className="text-[11px] text-merah">{state.error}</span>}
    </form>
  );
}
