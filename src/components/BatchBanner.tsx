import Link from "next/link";
import type { BatchEvaluation } from "@/lib/batch";

export function BatchBanner({ batch }: { batch: BatchEvaluation }) {
  if (!batch.isActive) return null;

  if (batch.isOpen) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-white shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 animate-pulse" />
          <p className="truncate text-xs font-semibold">
            <span className="font-extrabold">{batch.batchName} Dibuka:</span> Belanja online s/d {batch.scheduleText.split("s/d")[1]?.trim() || batch.scheduleText}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white">
          Aktif
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-red-950 p-4 text-white shadow-md">
      <div className="flex items-start gap-2.5">
        <span className="flex h-3 w-3 shrink-0 translate-y-1 rounded-full bg-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-red-200 uppercase tracking-wide">
            Pembelian Online Sedang Tutup
          </p>
          <p className="mt-0.5 text-xs text-white/90 font-medium">
            {batch.closedMessage}
          </p>
          <p className="mt-1 text-[11px] font-bold text-amber-300">
            ⏰ {batch.nextScheduleText}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
        <span className="text-white/70">Mau belanja sekarang di tempat?</span>
        <Link
          href="/order-langsung"
          className="font-extrabold text-[#FFD54A] hover:underline"
        >
          Order Langsung di Hub PTO →
        </Link>
      </div>
    </div>
  );
}
