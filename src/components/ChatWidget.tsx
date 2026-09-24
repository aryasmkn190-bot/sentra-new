"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  endChatSession,
  getMyChat,
  getUserChatUnread,
  sendUserChatMessage,
  startChatSession,
  type ChatMsg,
  type ChatThreadView,
} from "@/actions/chat";
import { CHAT_CATEGORIES, MAX_CHAT_IMAGE_BYTES, MAX_CHAT_IMAGE_MB } from "@/lib/chat";

type Props = { loggedIn: boolean };

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatWidget({ loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [thread, setThread] = useState<ChatThreadView | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);

  // start session form
  const [category, setCategory] = useState<string>(CHAT_CATEGORIES[0].code);
  const [detail, setDetail] = useState("");
  const [starting, setStarting] = useState(false);

  // end session confirm
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // image attach
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [imagePreview]);

  const loadFull = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    setError("");
    const res = await getMyChat();
    setLoading(false);
    if ("error" in res) {
      setError(res.error === "login" ? "login" : "Gagal muat chat");
      return;
    }
    setThread(res.thread);
    setMsgs(res.messages);
    lastIdRef.current = res.messages.at(-1)?.id ?? null;
    setUnread(0);
    scrollBottom();
  }, [loggedIn, scrollBottom]);

  const pollNew = useCallback(async () => {
    if (!loggedIn || !open) return;
    const after = lastIdRef.current;
    const res = await getMyChat(after);
    if ("error" in res) return;
    setThread(res.thread);
    if (res.messages.length) {
      setMsgs((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const add = res.messages.filter((m) => !ids.has(m.id));
        if (!add.length) return prev;
        lastIdRef.current = add.at(-1)?.id ?? lastIdRef.current;
        return [...prev, ...add];
      });
      scrollBottom();
    }
  }, [loggedIn, open, scrollBottom]);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    const tick = async () => {
      if (!alive || open) return;
      const r = await getUserChatUnread();
      if (alive) setUnread(r.count);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loggedIn, open]);

  useEffect(() => {
    if (!open || !loggedIn) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    loadFull();
    pollRef.current = setInterval(pollNew, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [open, loggedIn, loadFull, pollNew]);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    if (starting) return;
    setStarting(true);
    setError("");
    const res = await startChatSession(category, detail);
    setStarting(false);
    if ("error" in res) {
      setError(String(res.error));
      return;
    }
    setThread(res.thread);
    setMsgs([res.message]);
    lastIdRef.current = res.message.id;
    setDetail("");
    scrollBottom();
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!text.trim() && !image) return;
    setSending(true);
    setError("");
    const res = await sendUserChatMessage(text, image);
    setSending(false);
    if ("error" in res) {
      setError(res.error === "login" ? "login" : String(res.error || "Gagal kirim"));
      return;
    }
    setText("");
    clearImage();
    setMsgs((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      lastIdRef.current = res.message.id;
      return [...prev, res.message];
    });
    scrollBottom();
  }

  async function onEnd() {
    if (ending) return;
    setEnding(true);
    setError("");
    const res = await endChatSession();
    setEnding(false);
    if ("error" in res) {
      setError(String(res.error));
      return;
    }
    setThread(res.thread);
    setMsgs([]);
    lastIdRef.current = null;
    setEndOpen(false);
    clearImage();
  }

  function onPickImage(file: File | null) {
    if (!file) {
      clearImage();
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setError(`Gambar maksimal ${MAX_CHAT_IMAGE_MB} MB`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar");
      return;
    }
    setError("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const sessionOpen = thread?.status === "open";

  // Kunci scroll body saat panel chat terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const panel = open ? (
    <>
      {/* Backdrop — klik luar tutup chat */}
      <button
        type="button"
        aria-label="Tutup chat"
        className="fixed inset-0 z-[90] bg-black/45"
        onClick={() => setOpen(false)}
      />

      {/*
        Panel di-portal ke body (bukan child header sticky).
        Bottom sheet di atas bottom nav agar tidak aneh/terpotong.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat admin"
        className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-lg flex-col px-0 pb-[env(safe-area-inset-bottom)] sm:bottom-auto sm:top-[4.75rem] sm:h-[min(34rem,calc(100dvh-6rem))] sm:px-3 sm:pb-0"
        style={{ height: "min(36rem, calc(100dvh - 3.5rem))" }}
      >
        {/* text-slate-800: isolasi dari parent text-white */}
        <div className="flex h-full w-full flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white text-slate-800 shadow-2xl animate-slide-up sm:rounded-2xl">
          <div className="flex items-center justify-between bg-[#A00000] px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-extrabold">Chat Admin</p>
              <p className="truncate text-[11px] text-white/80">
                {sessionOpen
                  ? thread?.category_label || "Sesi aktif"
                  : "Mulai sesi untuk chat CS"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {sessionOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setEndOpen(true);
                    setError("");
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold hover:bg-white/10"
                  title="Akhiri sesi chat"
                >
                  Akhiri
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-white/10"
                aria-label="Tutup"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {!loggedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-slate-600">Login dulu biar bisa chat admin.</p>
              <Link href="/masuk?next=/" className="rounded-xl bg-[#A00000] px-4 py-2 text-sm font-bold text-white">
                Masuk
              </Link>
            </div>
          ) : loading && !thread ? (
            <p className="flex-1 py-12 text-center text-xs text-slate-400">Memuat…</p>
          ) : !sessionOpen ? (
            /* ── Start session form ── */
            <form onSubmit={onStart} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Belum ada sesi aktif. Pilih kategori dan jelaskan masalah untuk memulai chat.
                Saat sesi diakhiri, seluruh riwayat chat dihapus.
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Kategori masalah</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#A00000]/40 focus:ring-2 focus:ring-[#A00000]/15"
                  required
                >
                  {CHAT_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-white text-slate-800">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Detail singkat</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: pesanan SENT-… belum update status sejak kemarin"
                  className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#A00000]/40 focus:ring-2 focus:ring-[#A00000]/15"
                  required
                />
                <p className="mt-0.5 text-right text-[10px] text-slate-400">{detail.length}/500</p>
              </div>
              {error && error !== "login" && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={starting || detail.trim().length < 5}
                className="mt-auto rounded-xl bg-[#A00000] py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {starting ? "Memulai…" : "Mulai sesi chat"}
              </button>
            </form>
          ) : (
            /* ── Active session ── */
            <>
              {thread?.admin_joined ? (
                <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-[11px] font-semibold text-emerald-800">
                  ✓ Admin CS sudah bergabung ke sesi ini
                </div>
              ) : (
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
                  Menunggu admin bergabung…
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
                {loading && !msgs.length && (
                  <p className="py-8 text-center text-xs text-slate-400">Memuat…</p>
                )}
                {msgs.map((m) => {
                  if (m.sender_type === "system") {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="max-w-[95%] rounded-xl bg-slate-200/80 px-3 py-1.5 text-center text-[11px] text-slate-600">
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{fmtTime(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  }
                  const mine = m.sender_type === "user";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? "rounded-br-md bg-[#A00000] text-white"
                            : "rounded-bl-md border border-black/5 bg-white text-slate-800"
                        }`}
                      >
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.image_url}
                              alt="Lampiran chat"
                              loading="lazy"
                              className="max-h-48 w-full rounded-lg bg-black/5 object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                const fallback = el.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.hidden = false;
                              }}
                            />
                            <span
                              hidden
                              className="block rounded-lg border border-dashed border-black/20 bg-white/50 px-2 py-3 text-center text-[11px] text-slate-500"
                            >
                              Gambar tidak bisa dimuat
                            </span>
                          </a>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {fmtTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {error && error !== "login" && (
                <p className="bg-red-50 px-3 py-1 text-xs text-red-600">{error}</p>
              )}

              {imagePreview && (
                <div className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-12 w-12 rounded-lg border border-black/10 object-cover"
                  />
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{image?.name}</p>
                  <button type="button" onClick={clearImage} className="text-xs font-bold text-red-600">
                    Hapus
                  </button>
                </div>
              )}

              <form onSubmit={onSend} className="flex gap-2 border-t border-black/5 bg-white p-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 rounded-xl border border-black/10 px-2.5 text-slate-600 hover:bg-slate-50"
                  aria-label="Lampirkan gambar"
                  title="Lampirkan gambar (maks 10 MB)"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  placeholder="Tulis pesan…"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#A00000]/40 focus:ring-2 focus:ring-[#A00000]/15"
                />
                <button
                  type="submit"
                  disabled={sending || (!text.trim() && !image)}
                  className="rounded-xl bg-[#A00000] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Kirim
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-white transition-colors hover:text-white/80"
        aria-label="Chat admin"
        aria-expanded={open}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-kilat px-0.5 text-[9px] font-extrabold text-tinta shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Portal ke body: lepas dari sticky header (z-30 / pointer-events / stacking) */}
      {mounted && panel && createPortal(panel, document.body)}

      {/* Confirm end — z di atas panel chat */}
      {mounted &&
        endOpen &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-chat-title"
              className="w-full max-w-sm animate-slide-up rounded-2xl bg-white p-5 shadow-2xl"
            >
              <h3 id="end-chat-title" className="text-base font-extrabold text-slate-800">
                Akhiri sesi chat?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Seluruh pesan dan gambar di sesi ini akan <strong>dihapus permanen</strong> dan tidak bisa dikembalikan.
                Untuk chat lagi, kamu harus mulai sesi baru dengan kategori masalah.
              </p>
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEndOpen(false);
                    setError("");
                  }}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={ending}
                  onClick={onEnd}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {ending ? "Menghapus…" : "Ya, akhiri"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
