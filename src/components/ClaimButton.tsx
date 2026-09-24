"use client";

import { useState } from "react";
import { claimVoucher } from "@/actions/vouchers";

export function ClaimButton({ voucherId, className }: { voucherId: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    if (loading || done) return;
    setLoading(true);
    setErr(null);
    const res = await claimVoucher(voucherId);
    if (res && "error" in res && res.error) {
      setErr(res.error);
      setLoading(false);
    } else {
      setDone(true);
      window.location.reload();
    }
  };

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
        ✓ Diklaim
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={loading}
        className={className ?? "rounded-full bg-hijau px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-60"}
      >
        {loading ? "Mengklaim..." : "Klaim"}
      </button>
      {err && <span className="text-[10px] font-bold text-merah">{err}</span>}
    </span>
  );
}
