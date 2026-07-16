"use client";

import { useActionState } from "react";
import { requestPartnerOtp, verifyPartnerOtp } from "@/actions/auth";

export function PartnerLoginForm() {
  const [reqState, reqAction, reqPending] = useActionState(requestPartnerOtp, null);
  const [verState, verAction, verPending] = useActionState(verifyPartnerOtp, null);

  const step = verState?.step === "otp" || reqState?.step === "otp" ? "otp" : "phone";
  const phone = verState?.phone ?? reqState?.phone ?? "";
  const error = verState?.error ?? reqState?.error;
  const devCode = reqState?.devCode;

  return (
    <div className="kartu p-5">
      {step === "phone" ? (
        <form action={reqAction} className="space-y-3">
          <label className="label" htmlFor="phone">Nomor HP mitra terdaftar</label>
          <input id="phone" name="phone" className="input" inputMode="tel" placeholder="08…" autoFocus required />
          {error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{error}</p>}
          <button className="btn-utama w-full" disabled={reqPending}>{reqPending ? "Mengirim…" : "Kirim OTP"}</button>
        </form>
      ) : (
        <form action={verAction} className="space-y-3">
          <input type="hidden" name="phone" value={phone} />
          <p className="text-sm">Kode dikirim ke <b>{phone}</b></p>
          {devCode && (
            <p className="rounded-xl bg-kilat/30 p-2 text-center text-xs font-bold">Mode dev — kode: {devCode}</p>
          )}
          <input name="code" className="input text-center text-xl font-extrabold tracking-[0.4em]" inputMode="numeric" maxLength={6} autoFocus required />
          {error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{error}</p>}
          <button className="btn-utama w-full" disabled={verPending}>{verPending ? "Memeriksa…" : "Masuk"}</button>
        </form>
      )}
    </div>
  );
}
