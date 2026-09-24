"use client";

import { useState } from "react";
import Link from "next/link";
import { claimVoucher } from "@/actions/vouchers";
import { rupiah } from "@/lib/money";

type Props = {
  voucher: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
    min_order_amount: number;
  };
  claimed: boolean;
  loggedIn: boolean;
  restriction?: string | null;
};

export function HomeVoucherCard({ voucher, claimed, loggedIn, restriction }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "claimed">(
    claimed ? "claimed" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (state !== "idle") return;
    setState("loading");
    setError(null);
    const res = await claimVoucher(voucher.id);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setState("idle");
    } else {
      setState("claimed");
    }
  };

  const label =
    voucher.type === "fixed"
      ? `Diskon ${rupiah(voucher.value)}`
      : voucher.type === "percentage"
        ? `Diskon hingga ${voucher.value}%`
        : "Gratis ongkir";

  return (
    <div className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#A00000] to-[#C00000] p-4 text-white shadow-md shadow-[#A00000]/20">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-white/80">Voucher spesial untukmu</p>
        <p className="mt-0.5 truncate text-sm font-extrabold">{label}</p>
        <p className="mt-0.5 text-[11px] text-white/70">
          {restriction ? (
            <span className="text-[#FFD54A]">{restriction}</span>
          ) : (
            <>
              Kode <span className="font-bold text-[#FFD54A]">{voucher.code}</span>
              {" · "}min. {rupiah(voucher.min_order_amount)}
            </>
          )}
        </p>
        {error && <p className="mt-1 text-[10px] font-bold text-[#FFD54A]">{error}</p>}
      </div>

      {state === "claimed" ? (
        <Link
          href="/akun/voucher"
          className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-[#A00000]"
        >
          Sudah diklaim ✓
        </Link>
      ) : !loggedIn ? (
        <Link
          href="/masuk?next=/"
          className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-[#A00000]"
        >
          Klaim →
        </Link>
      ) : (
        <button
          onClick={handleClaim}
          disabled={state === "loading"}
          className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-[#A00000] disabled:opacity-60"
        >
          {state === "loading" ? "Mengklaim..." : "Klaim →"}
        </button>
      )}
    </div>
  );
}
