"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { placeOrder } from "@/actions/checkout";
import { getCheckoutVouchers } from "@/actions/vouchers";
import { rupiah } from "@/lib/money";

type DropPointOpt = { id: string; name: string };

export function CheckoutForm({
  dropPoints,
  subtotal,
  preferredDropPointId = null,
}: {
  dropPoints: DropPointOpt[];
  subtotal: number;
  preferredDropPointId?: string | null;
}) {
  const [orderState, orderAction, orderPending] = useActionState(placeOrder, null);

  // Voucher klaim yang valid utk keranjang ini
  const [vouchers, setVouchers] = useState<any[] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    getCheckoutVouchers(subtotal).then((res) => {
      setVouchers(res.items ?? []);
      setSelectedClaim(null);
    });
  }, [subtotal]);

  const discount = selectedClaim?.discount ?? 0;
  const total = Math.max(subtotal - discount, 0);

  const preferredActive =
    preferredDropPointId && dropPoints.some((dp) => dp.id === preferredDropPointId)
      ? preferredDropPointId
      : null;
  const defaultDropPointId = preferredActive || dropPoints[0]?.id || "";

  const card = "rounded-2xl border border-black/5 bg-white p-4 shadow-sm";

  return (
    <div className="space-y-5 px-5 pt-2 pb-4">
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold text-tinta">Checkout</h1>
        <p className="text-xs font-medium text-tinta/50">Step 1 of 3</p>
      </div>

      {/* Drop Point */}
      <section>
        <h2 className="text-sm font-extrabold text-tinta mb-3">Drop Point Pengambilan</h2>
        <div className={card}>
          {preferredActive && (
            <p className="mb-3 rounded-xl bg-hijau-muda px-3 py-2 text-[11px] font-medium leading-relaxed text-hijau-tua">
              Terisi otomatis dari profilmu. Silakan ganti jika perlu untuk pesanan ini.
            </p>
          )}
          <div className="space-y-2">
            {dropPoints.map((dp) => (
              <label
                key={dp.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 p-3 has-[:checked]:border-hijau has-[:checked]:bg-hijau-muda"
              >
                <input
                  type="radio"
                  name="drop_point_id"
                  value={dp.id}
                  form="order-form"
                  defaultChecked={dp.id === defaultDropPointId}
                  className="mt-0.5 accent-hijau"
                />
                <span className="text-sm font-semibold">{dp.name}</span>
                {preferredActive && dp.id === preferredActive && (
                  <span className="ml-auto rounded-full bg-hijau/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hijau">
                    Default
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Form order */}
      <form id="order-form" action={orderAction} className="space-y-5">
        {/* Substitution preference */}
        <section>
          <h2 className="text-sm font-extrabold text-tinta mb-3">
            Kalau ada item habis saat picking?
          </h2>
          <div className={`${card} space-y-2`}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="substitution_preference"
                value="refund"
                defaultChecked
                className="accent-hijau"
              />
              Refund item itu saja
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="substitution_preference"
                value="replace"
                className="accent-hijau"
              />
              Ganti dengan produk serupa
            </label>
          </div>
        </section>

        {/* Voucher & catatan penjual */}
        <section>
          <h2 className="text-sm font-extrabold text-tinta mb-3">
            Voucher & Catatan
          </h2>
          <div className={`${card} space-y-3`}>
            <div>
              <label className="label" htmlFor="voucher_id">
                Voucher saya (opsional)
              </label>
              {vouchers === null ? (
                <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              ) : vouchers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-tinta/60">
                  Belum ada voucher yang bisa dipakai untuk keranjang ini.{" "}
                  <Link href="/akun/voucher" className="font-bold text-hijau underline">
                    Lihat voucherku
                  </Link>
                </div>
              ) : (
                <select
                  id="voucher_id"
                  name="voucher_id"
                  form="order-form"
                  className="input"
                  value={selectedClaim?.claimId ?? ""}
                  onChange={(e) => {
                    const v = vouchers.find((x) => x.claimId === e.target.value) ?? null;
                    setSelectedClaim(v);
                    if (v) setManualCode("");
                  }}
                >
                  <option value="">— Pilih voucher —</option>
                  {vouchers.map((v) => (
                    <option key={v.claimId} value={v.claimId}>
                      {v.name} · potong {v.type === "free_delivery" ? "ongkir" : rupiah(v.discount)}
                      {v.restriction ? ` · ${v.restriction}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedClaim && (
                <p className="mt-1 rounded-xl bg-hijau-muda px-3 py-2 text-[11px] font-semibold text-hijau-tua">
                  ✓ Voucher <span className="font-extrabold">{selectedClaim.name}</span> dipakai — potong{" "}
                  {selectedClaim.type === "free_delivery" ? "ongkir" : rupiah(selectedClaim.discount)}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="voucher_code">
                atau pakai kode voucher (opsional)
              </label>
              <input
                id="voucher_code"
                name="voucher_code"
                className="input uppercase"
                placeholder="BARUKILAT"
                value={manualCode}
                disabled={!!selectedClaim}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  if (e.target.value) setSelectedClaim(null);
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="seller_note">
                Catatan untuk penjual (opsional)
              </label>
              <textarea
                id="seller_note"
                name="seller_note"
                rows={3}
                maxLength={500}
                className="input min-h-[88px] resize-y"
                placeholder="Contoh: Tolong pilih yang matang / jangan campur barang mudah remuk…"
              />
              <p className="mt-1 text-[11px] text-tinta/40">Maks. 500 karakter. Akan dibaca admin & picker.</p>
            </div>
          </div>
        </section>

        {/* Order Summary */}
        <section>
          <h2 className="text-sm font-extrabold text-tinta mb-3">
            Ringkasan Pesanan
          </h2>
          <div className={`${card} space-y-2 text-sm`}>
            <div className="flex justify-between">
              <span className="text-tinta/60">Subtotal</span>
              <span className="tabular-nums font-medium">{rupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-hijau-tua">
                <span className="font-semibold">Diskon voucher</span>
                <span className="tabular-nums font-bold">−{rupiah(discount)}</span>
              </div>
            )}
            <div className="border-t border-black/5 pt-2" />
            <div className="flex justify-between text-base font-extrabold">
              <span>Total</span>
              <span className="tabular-nums text-brand">{rupiah(total)}</span>
            </div>
          </div>
        </section>

        {orderState?.error && (
          <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-merah shadow-sm">
            {orderState?.error}
          </div>
        )}

        {/* Bottom CTA Bar */}
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-100 bg-white px-6 pb-6 pt-4">
          <button
            type="submit"
            disabled={orderPending}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-tua active:scale-[0.98] disabled:opacity-50"
          >
            {orderPending ? "Membuat pesanan…" : `Bayar ${rupiah(total)}`}
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-tinta/40">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure and encrypted transaction
          </div>
        </div>

        <div className="h-28" />
      </form>
    </div>
  );
}
