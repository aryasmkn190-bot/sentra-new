"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/actions/checkout";
import { rupiah } from "@/lib/money";

type DropPointOpt = { id: string; name: string };

export function CheckoutForm({
  dropPoints,
  subtotal,
}: {
  dropPoints: DropPointOpt[];
  subtotal: number;
}) {
  const [orderState, orderAction, orderPending] = useActionState(placeOrder, null);

  const estimatedTotal = subtotal;

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
          <div className="space-y-2">
            {dropPoints.map((dp, i) => (
              <label
                key={dp.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 p-3 has-[:checked]:border-hijau has-[:checked]:bg-hijau-muda"
              >
                <input
                  type="radio"
                  name="drop_point_id"
                  value={dp.id}
                  form="order-form"
                  defaultChecked={i === 0}
                  className="mt-0.5 accent-hijau"
                />
                <span className="text-sm font-semibold">{dp.name}</span>
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

        {/* Voucher & notes */}
        <section>
          <h2 className="text-sm font-extrabold text-tinta mb-3">
            Voucher & Catatan
          </h2>
          <div className={`${card} space-y-3`}>
            <div>
              <label className="label" htmlFor="voucher_code">
                Kode voucher (opsional)
              </label>
              <input
                id="voucher_code"
                name="voucher_code"
                className="input uppercase"
                placeholder="BARUKILAT"
              />
            </div>
            <div>
              <label className="label" htmlFor="delivery_note">
                Instruksi pengiriman (opsional)
              </label>
              <input
                id="delivery_note"
                name="delivery_note"
                className="input"
                placeholder="Tinggalkan di depan pintu…"
              />
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
            <div className="border-t border-black/5 pt-2" />
            <div className="flex justify-between text-base font-extrabold">
              <span>Total</span>
              <span className="tabular-nums text-brand">{rupiah(estimatedTotal)}</span>
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
            {orderPending ? "Membuat pesanan…" : "Proceed to Payment"}
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