"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string | null;
  date_of_birth: Date | null;
};

export function ProfileForm({
  user,
  action,
}: {
  user: User;
  action: (prev: unknown, fd: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      setTimeout(() => router.push("/akun"), 800);
    }
  }, [state, router]);

  const dobValue = user.date_of_birth
    ? new Date(user.date_of_birth).toISOString().split("T")[0]
    : "";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label">Nama Lengkap</label>
        <input
          name="name"
          defaultValue={user.name}
          placeholder="Masukkan nama lengkap"
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={user.email || ""}
          placeholder="email@contoh.com (opsional)"
          className="input"
        />
      </div>

      <div>
        <label className="label">Tanggal Lahir</label>
        <input
          name="date_of_birth"
          type="date"
          defaultValue={dobValue}
          className="input"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 text-center">
          {state.error}
        </p>
      )}

      {saved && (
        <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2.5 text-center">
          ✓ Profil berhasil diperbarui
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white hover:bg-[#800000] disabled:opacity-50 transition"
      >
        {pending ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  );
}