"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestUserOtp, verifyUserOtp } from "@/actions/auth";
import type { AuthState } from "@/actions/auth";

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    async (prev, fd) => {
      if (step === "phone") return requestUserOtp(prev, fd);
      return verifyUserOtp(prev, fd);
    },
    null,
  );

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const phoneRef = useRef<HTMLInputElement>(null);

  // Follow server-side step transitions
  useEffect(() => {
    if (state?.step === "otp") setStep("otp");
  }, [state?.step]);

  // Auto-focus when step changes
  useEffect(() => {
    if (step === "otp") {
      const el = document.querySelector<HTMLInputElement>('input[name="code"]');
      el?.focus();
    } else {
      phoneRef.current?.focus();
    }
  }, [step]);

  if (step === "otp" && state?.step === "otp") {
    return (
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="phone" value={state.phone} />
        {next && <input type="hidden" name="next" value={next} />}

        <div className="text-center space-y-1">
          <p className="text-sm text-slate-500">
            Kode verifikasi dikirim ke{" "}
            <span className="font-semibold text-slate-800">{state.phone}</span>
          </p>
          {state.devCode && (
            <div className="mt-2 inline-block rounded-full bg-amber-50 border border-amber-300 px-4 py-1.5">
              <span className="text-xs text-amber-700 font-medium">DEV:</span>{" "}
              <span className="text-sm font-bold text-amber-800 tracking-widest">{state.devCode}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Kode OTP
          </label>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Masukkan 6 digit kode"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-[.3em] text-center font-bold text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
            autoComplete="one-time-code"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 text-center">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white hover:bg-[#800000] disabled:opacity-50 transition"
        >
          {pending ? "Memverifikasi..." : "Verifikasi & Masuk"}
        </button>

        <button
          type="button"
          onClick={() => setStep("phone")}
          className="w-full text-sm text-slate-500 hover:text-brand font-medium transition"
        >
          ← Ganti nomor HP
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Nomor HP
        </label>
        <input
          ref={phoneRef}
          name="phone"
          type="tel"
          placeholder="081234567890"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
          autoComplete="tel"
          autoFocus
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white hover:bg-[#800000] disabled:opacity-50 transition"
      >
        {pending ? "Mengirim..." : "Kirim Kode OTP"}
      </button>
    </form>
  );
}
