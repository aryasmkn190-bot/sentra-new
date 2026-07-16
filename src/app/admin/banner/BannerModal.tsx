"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { BannerForm } from "./BannerForm";
import { getProduct } from "@/actions/admin";

type BannerItem = {
  id: string; title: string; image_url: string; target_url: string;
  placement: string; sort_order: number; start_at: Date; end_at: Date; is_active: boolean;
};

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; banner?: BannerItem | null };

export function BannerModal({ open, onClose, onSuccess, banner }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.style.overflow = "hidden"; }
    else if (!open && d.open) { d.close(); document.body.style.overflow = ""; }
  }, [open]);

  const hClose = useCallback(() => { document.body.style.overflow = ""; onClose(); }, [onClose]);
  const hSuccess = useCallback(() => { document.body.style.overflow = ""; onSuccess(); }, [onSuccess]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const h = () => hClose();
    d.addEventListener("cancel", h);
    return () => d.removeEventListener("cancel", h);
  }, [hClose]);

  if (!open) return null;

  const isEdit = !!banner?.id;
  const title = isEdit ? "Edit Banner" : "Banner Baru";

  return (
    <dialog ref={dialogRef} className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => { if (e.target === dialogRef.current) hClose(); }}>
      <div className="relative w-full max-w-xl rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
          <button onClick={hClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto p-5">
          <BannerForm banner={banner} inModal onSuccess={hSuccess} onCancel={hClose} />
        </div>
      </div>
      <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 md:hidden" />
    </dialog>
  );
}
