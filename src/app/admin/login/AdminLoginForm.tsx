"use client";

import { useActionState } from "react";
import { adminLogin } from "@/actions/admin";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="kartu space-y-3 p-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoFocus required />
      </div>
      <div>
        <label className="label" htmlFor="password">Kata sandi</label>
        <input id="password" name="password" type="password" className="input" required />
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>}
      <button className="btn-utama w-full" disabled={pending}>{pending ? "Memeriksa…" : "Masuk"}</button>
    </form>
  );
}
