"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell } from "@/components/MenuIcons";
import {
  getUserNotifications,
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
  type UserNotification,
} from "@/actions/announcements";

type Props = {
  hasUnread: boolean;
  loggedIn: boolean;
};

function typeBadge(type: string) {
  if (type === "promo") return "bg-purple-100 text-purple-700";
  if (type === "discount") return "bg-red-100 text-red-700";
  if (type === "release") return "bg-blue-100 text-blue-700";
  if (type === "warning") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function typeLabel(type: string) {
  if (type === "discount") return "Diskon";
  if (type === "release") return "Produk Baru";
  return type;
}

export function NotificationBell({ hasUnread, loggedIn }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(hasUnread);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUnread(hasUnread);
  }, [hasUnread]);

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = "";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getUserNotifications();
    setItems(res.items);
    setUnread(res.unreadCount > 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      load();
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [open, load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [close]);

  const openModal = () => {
    if (!loggedIn) {
      window.location.href = "/masuk?next=/";
      return;
    }
    setOpen(true);
  };

  const markOne = async (id: string) => {
    setBusy(true);
    await markAnnouncementAsRead(id);
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, is_read: true } : i));
      setUnread(next.some((i) => !i.is_read));
      return next;
    });
    setBusy(false);
  };

  const markAll = async () => {
    setBusy(true);
    await markAllAnnouncementsAsRead();
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    setUnread(false);
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="relative text-white hover:text-white/80 transition-colors"
        aria-label="Notifikasi"
      >
        <IconBell size={24} />
        {unread && (
          <span className="absolute right-2 top-1 h-2 w-2 rounded-[4px] bg-kilat animate-pulse" />
        )}
      </button>

      {open && (
        <dialog
          ref={dialogRef}
          className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
          onClick={(e) => {
            if (e.target === dialogRef.current) close();
          }}
        >
          <div
            className="relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-tinta">Notifikasi</h2>
                <p className="text-[11px] text-tinta/50">Promo, diskon, info penting</p>
              </div>
              <div className="flex items-center gap-2">
                {items.some((i) => !i.is_read) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={markAll}
                    className="text-[11px] font-bold text-[#A00000] hover:underline disabled:opacity-50"
                  >
                    Tandai semua
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                  aria-label="Tutup"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[70dvh] overflow-y-auto p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-black/5 p-4 space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                ))
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center space-y-2">
                  <div className="rounded-full bg-tinta/5 p-4 text-tinta/40">
                    <IconBell size={32} />
                  </div>
                  <p className="text-sm font-bold text-tinta/60">Belum ada notifikasi</p>
                </div>
              ) : (
                items.map((a) => (
                  <div
                    key={a.id}
                    className={`relative rounded-2xl border border-black/5 bg-white p-4 shadow-sm ${
                      !a.is_read ? "border-[#A00000]/20 bg-[#A00000]/5" : ""
                    }`}
                  >
                    {!a.is_read && (
                      <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-[#A00000]" />
                    )}
                    <div className="flex items-center gap-2 pr-5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${typeBadge(a.type)}`}>
                        {typeLabel(a.type)}
                      </span>
                      <span className="text-[10px] text-tinta/40">
                        {new Date(a.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-tinta">{a.title}</h3>
                    <p className="mt-0.5 text-xs text-tinta/80 whitespace-pre-line leading-relaxed">{a.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {a.target_url ? (
                        <Link
                          href={a.target_url}
                          onClick={close}
                          className="text-xs font-bold text-[#A00000] hover:underline"
                        >
                          Lihat selengkapnya
                        </Link>
                      ) : (
                        <span />
                      )}
                      {!a.is_read && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markOne(a.id)}
                          className="text-[10px] font-bold text-tinta/40 hover:text-tinta/70 hover:underline disabled:opacity-50"
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 md:hidden" />
          </div>
        </dialog>
      )}
    </>
  );
}
