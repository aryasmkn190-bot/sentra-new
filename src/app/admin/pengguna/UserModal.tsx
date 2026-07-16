"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useActionState } from "react";
import { getUser, updateUser } from "@/actions/admin";

type UserItem = {
  id: string;
  name: string;
  phone_number: string;
  email: string | null;
  status: string;
  is_age_verified: boolean;
  date_of_birth: Date | null;
  referral_code: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string | null;
};

export function UserModal({ open, onClose, onSuccess, userId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [user, setUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, formAction, pending] = useActionState(updateUser, null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      loadData();
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [open, userId]);

  const loadData = async () => {
    setLoading(true);
    if (userId) {
      const u = await getUser(userId);
      setUser(u as UserItem | null);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const handleClose = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(() => {
    document.body.style.overflow = "";
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    if (state?.ok) handleSuccess();
  }, [state, handleSuccess]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = () => handleClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleClose]);

  if (!open) return null;

  const dobValue = user?.date_of_birth
    ? new Date(user.date_of_birth).toISOString().split("T")[0]
    : "";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
    >
      <div
        className="relative w-full max-w-xl rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-800">Ubah Data User</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          ) : user ? (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="id" value={user.id} />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama</label>
                <input name="name" defaultValue={user.name} className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-hijau focus:ring-2 focus:ring-hijau/20 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nomor HP</label>
                <input value={user.phone_number} disabled className="w-full rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-slate-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                <input name="email" type="email" defaultValue={user.email || ""} placeholder="email@contoh.com (opsional)" className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-hijau focus:ring-2 focus:ring-hijau/20 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Lahir</label>
                <input name="date_of_birth" type="date" defaultValue={dobValue} className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-hijau focus:ring-2 focus:ring-hijau/20 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                <select name="status" defaultValue={user.status} className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-hijau focus:ring-2 focus:ring-hijau/20 outline-none">
                  <option value="active">Aktif</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" name="is_age_verified" defaultChecked={user.is_age_verified} className="h-4 w-4 rounded border-black/20 text-hijau focus:ring-hijau/20" />
                <span className="text-sm font-semibold text-slate-700">Verifikasi umur (18+)</span>
              </label>

              {state?.error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 text-center">{state.error}</p>
              )}

              <button type="submit" disabled={pending} className="btn-utama w-full !py-3 text-sm font-bold disabled:opacity-50">
                {pending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-slate-400 py-8">User tidak ditemukan.</p>
          )}
        </div>
      </div>
      <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 md:hidden" />
    </dialog>
  );
}