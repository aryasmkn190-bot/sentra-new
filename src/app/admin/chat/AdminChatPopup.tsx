"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  endChatSessionAsAdmin,
  getChatThread,
  getChatThreads,
  joinChatThread,
  sendAdminChatMessage,
  type ChatMsg,
} from "@/actions/chat";
import { MAX_CHAT_IMAGE_BYTES, MAX_CHAT_IMAGE_MB } from "@/lib/chat";

type ThreadRow = {
  id: string;
  status: string;
  category: string;
  category_label: string;
  category_detail: string;
  admin_joined: boolean;
  last_message_at: string;
  last_preview: string;
  unread_admin: number;
  user: { id: string; name: string; phone_number: string };
};

type ThreadDetail = {
  id: string;
  status: string;
  category: string;
  category_label: string;
  category_detail: string;
  admin_joined: boolean;
  admin_joined_at: string | null;
  user: { id: string; name: string; phone_number: string };
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AdminChatPopup({ open, onClose }: Props) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [err, setErr] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearImage = useCallback(() => {
    setImage(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function onPickImage(file: File | null) {
    if (!file) {
      clearImage();
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setErr(`Gambar maksimal ${MAX_CHAT_IMAGE_MB} MB`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("File harus berupa gambar");
      return;
    }
    setErr("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch threads list
  const fetchList = useCallback(async () => {
    setLoadingList(true);
    const res = await getChatThreads(1, search, "open");
    setLoadingList(false);
    if (!("error" in res)) {
      setThreads(res.items);
    }
  }, [search]);

  useEffect(() => {
    if (open) {
      fetchList();
      listPollRef.current = setInterval(fetchList, 8000);
    }
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
    };
  }, [open, fetchList]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  // Fetch active thread detail & poll
  useEffect(() => {
    clearImage();
    if (!activeThreadId || !open) {
      setThread(null);
      setMessages([]);
      lastIdRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    let isMounted = true;
    (async () => {
      setLoadingMessages(true);
      setErr("");
      const res = await getChatThread(activeThreadId);
      if (!isMounted) return;
      setLoadingMessages(false);

      if ("error" in res) {
        setErr(String(res.error || "Gagal memuat percakapan"));
        return;
      }

      setThread(res.thread as ThreadDetail);
      setMessages(res.messages);
      lastIdRef.current = res.messages.at(-1)?.id ?? null;
      scrollToBottom();
      fetchList();

      if (res.thread.status === "open" && !res.thread.admin_joined) {
        await joinChatThread(activeThreadId);
      }
    })();

    pollRef.current = setInterval(async () => {
      const after = lastIdRef.current;
      const res = await getChatThread(activeThreadId, after);
      if ("error" in res) return;
      if (res.thread) {
        setThread(res.thread as ThreadDetail);
        if (res.thread.status === "closed") {
          setMessages([]);
          lastIdRef.current = null;
          clearImage();
          return;
        }
      }
      if (!res.messages.length) return;

      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const newOnes = res.messages.filter((m) => !ids.has(m.id));
        if (!newOnes.length) return prev;
        lastIdRef.current = newOnes.at(-1)?.id ?? lastIdRef.current;
        return [...prev, ...newOnes];
      });
      scrollToBottom();
    }, 4000);

    return () => {
      isMounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeThreadId, open, fetchList, scrollToBottom, clearImage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadId || sending) return;
    if (!text.trim() && !image) return;

    setSending(true);
    setErr("");
    const res = await sendAdminChatMessage(activeThreadId, text.trim(), image);
    setSending(false);

    if ("error" in res) {
      setErr(String(res.error || "Gagal mengirim pesan"));
      return;
    }

    setText("");
    clearImage();
    setMessages((prev) => [...prev, res.message]);
    lastIdRef.current = res.message.id;
    scrollToBottom();
    fetchList();
  };

  const handleEndSession = async () => {
    if (!activeThreadId || ending) return;
    if (!confirm("Akhiri sesi chat ini dengan pelanggan?")) return;

    setEnding(true);
    const res = await endChatSessionAsAdmin(activeThreadId);
    setEnding(false);

    if ("error" in res) {
      alert(res.error || "Gagal mengakhiri sesi");
      return;
    }

    clearImage();
    setActiveThreadId(null);
    fetchList();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 bg-black/40 backdrop-blur-[1px]">
      <div
        className="relative flex h-[85dvh] sm:h-[600px] w-full sm:w-[420px] flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden border border-black/10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Pop-up */}
        <div className="flex items-center justify-between border-b border-black/5 bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            {activeThreadId ? (
              <button
                type="button"
                onClick={() => {
                  clearImage();
                  setActiveThreadId(null);
                }}
                className="rounded-lg p-1 hover:bg-white/10 text-slate-300"
                title="Kembali ke daftar pesan"
              >
                ←
              </button>
            ) : (
              <span className="text-base">💬</span>
            )}
            <div>
              <h3 className="text-xs font-extrabold text-white leading-tight">
                {activeThreadId && thread ? thread.user.name || thread.user.phone_number : "Live Chat Pelanggan"}
              </h3>
              <p className="text-[10px] text-emerald-400 font-semibold">
                {activeThreadId ? (thread?.status === "open" ? "🟢 Sesi Terbuka" : "⚪ Sesi Ditutup") : "Sentra Support Pop-up"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/admin/chat"
              onClick={onClose}
              className="rounded-lg p-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
              title="Buka halaman penuh"
            >
              ⤢
            </Link>
            <button
              type="button"
              onClick={() => {
                clearImage();
                onClose();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white text-xs font-bold"
              title="Tutup Pop-up"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Pop-up */}
        {!activeThreadId ? (
          /* View 1: Daftar Percakapan */
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
            <div className="p-3 bg-white border-b border-black/5">
              <input
                type="text"
                placeholder="Cari nama atau nomor HP pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/5 p-2 space-y-1">
              {loadingList ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/50 p-3" />
                ))
              ) : threads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada sesi chat yang sedang terbuka.
                </div>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className="flex cursor-pointer items-start justify-between rounded-xl bg-white p-3 hover:bg-emerald-50/60 transition shadow-sm border border-black/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 truncate">
                          {t.user.name || t.user.phone_number}
                        </span>
                        {t.category_label && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 shrink-0">
                            {t.category_label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 truncate">
                        {t.last_preview || "Pesan baru..."}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {new Date(t.last_message_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {t.unread_admin > 0 && (
                      <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shrink-0">
                        {t.unread_admin}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* View 2: Obrolan Aktif */
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-100/50">
            {/* Info Pelanggan Singkat */}
            {thread && (
              <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-2 text-[11px]">
                <div className="min-w-0">
                  <span className="font-bold text-slate-700">{thread.user.phone_number}</span>
                  {thread.category_label && (
                    <span className="ml-2 text-slate-400">· {thread.category_label}</span>
                  )}
                </div>
                {thread.status === "open" && (
                  <button
                    type="button"
                    onClick={handleEndSession}
                    disabled={ending}
                    className="font-bold text-merah hover:underline text-[10px]"
                  >
                    {ending ? "Mengakhiri…" : "Akhiri Sesi"}
                  </button>
                )}
              </div>
            )}

            {/* Area Pesan */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-slate-400">Memuat obrolan…</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Belum ada pesan.</div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_type === "admin";
                  const isSystem = m.sender_type === "system";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {m.body}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-2.5 text-xs shadow-sm ${
                          isAdmin
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-white text-slate-800 rounded-bl-none border border-black/5"
                        }`}
                      >
                        {m.image_url && (
                          <a
                            href={m.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-1.5 block overflow-hidden rounded-xl border border-black/10 bg-black/5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.image_url}
                              alt="Lampiran chat"
                              className="max-h-48 w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                      <span className="mt-0.5 text-[9px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Error Message */}
            {err && (
              <div className="bg-red-50 p-2 text-center text-[11px] font-bold text-merah border-t border-red-200">
                {err}
              </div>
            )}

            {imagePreview && (
              <div className="flex items-center gap-2 border-t border-black/5 bg-slate-50 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-10 w-10 rounded-lg object-cover border border-black/10 shrink-0"
                />
                <p className="min-w-0 flex-1 truncate text-xs text-slate-600 font-medium">
                  {image?.name}
                </p>
                <button
                  type="button"
                  onClick={clearImage}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0"
                >
                  Hapus
                </button>
              </div>
            )}

            {/* Form Input Balasan */}
            {thread?.status === "open" ? (
              <form onSubmit={handleSendMessage} className="border-t border-black/5 bg-white p-2.5 flex items-center gap-2">
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
                  disabled={sending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Lampirkan gambar"
                  title={`Lampirkan gambar (maks ${MAX_CHAT_IMAGE_MB} MB)`}
                >
                  <svg
                    width="18"
                    height="18"
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
                  type="text"
                  placeholder="Ketik balasan untuk pelanggan..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || (!text.trim() && !image)}
                  className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sending ? "…" : "Kirim"}
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 border-t border-black/5">
                Sesi chat ini sudah ditutup.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
