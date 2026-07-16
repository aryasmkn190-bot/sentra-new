"use client";

import { useEffect, useRef, useCallback } from "react";
import { AnnouncementForm } from "./AnnouncementForm";
import type { AnnouncementData } from "@/actions/announcements";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  announcement?: AnnouncementData | null;
};

export function AnnouncementModal({ open, onClose, onSuccess, announcement }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [open]);

  const handleClose = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(() => {
    document.body.style.overflow = "";
    onSuccess();
  }, [onSuccess]);

  // Close on Escape key (dialog handles this natively)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => handleClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleClose]);

  if (!open) return null;

  const isEdit = !!announcement?.id;
  const title = isEdit ? "Ubah Pengumuman" : "Buat Pengumuman Baru";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-xl rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - scrollable on mobile */}
        <div className="max-h-[70dvh] overflow-y-auto p-5">
          <AnnouncementForm
            announcement={announcement}
            inModal
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </div>
      </div>

      {/* Mobile drag handle */}
      <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70 md:hidden" />
    </dialog>
  );
}
