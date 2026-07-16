"use client";

import { useActionState } from "react";
import { requestUserOtp, verifyUserOtp } from "@/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [reqState, reqAction, reqPending] = useActionState(requestUserOtp, null);
  const [verState, verAction, verPending] = useActionState(verifyUserOtp, null);

  const step = verState?.step === "otp" || reqState?.step === "otp" ? "otp" : "phone";
  const phone = verState?.phone ?? reqState?.phone ?? "";
  const error = verState?.error ?? reqState?.error;
  const devCode = reqState?.devCode;

  return (
    <div className="kartu !shadow-none border border-black/5 p-6">
      {step === "phone" ? (
        <form action={reqAction} className="space-y-4">
          <div>
            <label className="label text-xs font-bold text-tinta/60" htmlFor="phone">Nomor HP</label>
            <input id="phone" name="phone" className="input !py-3 mt-1" inputMode="tel" placeholder="081234567890" autoFocus required />
          </div>
          {error && <p className="rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-merah">{error}</p>}
          <button className="btn-utama w-full !py-3" disabled={reqPending}>
            {reqPending ? "Mengirim…" : "Kirim kode OTP"}
          </button>
          <p className="text-center text-[10px] leading-relaxed text-tinta/40">
            Kode dikirim via WhatsApp atau SMS. Dengan masuk, kamu menyetujui S&K dan Kebijakan Privasi Sentra.
          </p>
        </form>
      ) : (
        <form action={verAction} className="space-y-4">
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="next" value={next} />
          <p className="text-xs text-tinta/70">
            Masukkan 6 digit kode yang dikirim ke <span className="font-extrabold text-tinta">{phone}</span>
          </p>
          {devCode && (
            <div className="rounded-xl bg-kilat/20 p-2.5 text-center text-xs font-bold text-tinta">
              Mode dev - kode OTP: <span className="tabular-nums font-extrabold text-hijau-tua">{devCode}</span>
            </div>
          )}
          <input
            name="code"
            className="input !py-3 text-center text-xl font-extrabold tracking-[0.4em]"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
          />
          {error && <p className="rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-merah">{error}</p>}
          <button className="btn-utama w-full !py-3" disabled={verPending}>
            {verPending ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      )}
    </div>
  );
}
