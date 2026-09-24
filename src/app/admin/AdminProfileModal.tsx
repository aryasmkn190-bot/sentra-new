"use client";

import { useActionState, useEffect, useState } from "react";
import { updateAdminProfile } from "@/actions/admin";

type Props = {
  open: boolean;
  onClose: () => void;
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export function AdminProfileModal({ open, onClose, admin }: Props) {
  const [state, formAction, pending] = useActionState(updateAdminProfile, null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSuccess(true);
      const timer = setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-slide-up space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Kelola Profil Admin</h3>
            <p className="text-xs text-slate-500">Perbarui data login dan keamanan akun backoffice Anda.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {state?.error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-merah border border-red-200">
            {state.error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
            Profil berhasil diperbarui!
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Role Akun</label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-800">
                {admin.role}
              </span>
              <span className="text-[11px] text-slate-400">Dikelola oleh sistem</span>
            </div>
          </div>

          <div>
            <label className="label">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              defaultValue={admin.name}
              required
              className="input font-bold"
            />
          </div>

          <div>
            <label className="label">Email Login</label>
            <input
              type="email"
              name="email"
              defaultValue={admin.email}
              required
              className="input font-mono"
            />
          </div>

          <div className="rounded-xl border border-black/5 bg-slate-50/70 p-3 space-y-3">
            <p className="text-xs font-extrabold text-slate-700">Ganti Password (Opsional)</p>
            <p className="text-[11px] text-slate-400">
              Kosongkan jika Anda tidak ingin mengubah password saat ini.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Password Baru</label>
              <input
                type="password"
                name="new_password"
                placeholder="Minimal 6 karakter..."
                className="input !text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                name="confirm_password"
                placeholder="Ulangi password baru..."
                className="input !text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-utama !py-2 !px-5 text-xs"
            >
              {pending ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
