"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  endChatSessionAsAdmin,
  getChatThread,
  getChatThreads,
  joinChatThread,
  sendAdminChatMessage,
  type ChatMsg,
} from "@/actions/chat";

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

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AdminChatPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ThreadRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const lastIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef<Set<string>>(new Set());

  const fetchList = useCallback(async () => {
    setLoading(true);
    const res = await getChatThreads(page, q, status);
    setLoading(false);
    if ("error" in res) return;
    setItems(res.items);
    setTotalItems(res.totalItems);
  }, [page, q, status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const id = setInterval(fetchList, 10000);
    return () => clearInterval(id);
  }, [fetchList]);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [imagePreview]);

  useEffect(() => {
    if (!activeId) {
      setThread(null);
      setMsgs([]);
      lastIdRef.current = null;
      clearImage();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      setMsgLoading(true);
      setErr("");
      const res = await getChatThread(activeId);
      if (cancelled) return;
      setMsgLoading(false);
      if ("error" in res) {
        setErr(String(res.error || "Gagal memuat"));
        return;
      }
      setThread(res.thread as ThreadDetail);
      setMsgs(res.messages);
      lastIdRef.current = res.messages.at(-1)?.id ?? null;
      scrollBottom();
      fetchList();

      // Auto-join notice once per open session when admin opens it
      if (res.thread.status === "open" && !res.thread.admin_joined && !joinedRef.current.has(activeId)) {
        joinedRef.current.add(activeId);
        const j = await joinChatThread(activeId);
        if (!("error" in j) && j.message) {
          setThread((t) => (t ? { ...t, admin_joined: true, admin_joined_at: j.thread.admin_joined_at } : t));
          setMsgs((prev) => {
            if (prev.some((m) => m.id === j.message!.id)) return prev;
            lastIdRef.current = j.message!.id;
            return [...prev, j.message!];
          });
          scrollBottom();
          fetchList();
        }
      }
    })();

    pollRef.current = setInterval(async () => {
      const after = lastIdRef.current;
      const res = await getChatThread(activeId, after);
      if ("error" in res) return;
      if (res.thread) {
        setThread((prev) =>
          prev
            ? {
                ...prev,
                status: res.thread.status,
                admin_joined: res.thread.admin_joined,
                admin_joined_at: res.thread.admin_joined_at,
                category_label: res.thread.category_label,
              }
            : prev,
        );
      }
      if (!res.messages.length) return;
      setMsgs((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const add = res.messages.filter((m) => !ids.has(m.id));
        if (!add.length) return prev;
        lastIdRef.current = add.at(-1)?.id ?? lastIdRef.current;
        return [...prev, ...add];
      });
      scrollBottom();
    }, 4000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, fetchList, scrollBottom]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || sending) return;
    if (!text.trim() && !image) return;
    setSending(true);
    setErr("");
    const res = await sendAdminChatMessage(activeId, text, image);
    setSending(false);
    if ("error" in res) {
      setErr(String(res.error || "Gagal kirim"));
      return;
    }
    setText("");
    clearImage();
    setMsgs((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      lastIdRef.current = res.message.id;
      return [...prev, res.message];
    });
    setThread((t) => (t ? { ...t, admin_joined: true } : t));
    scrollBottom();
    fetchList();
  }

  async function onEnd() {
    if (!thread || ending) return;
    setEnding(true);
    setErr("");
    const res = await endChatSessionAsAdmin(thread.id);
    setEnding(false);
    if ("error" in res) {
      setErr(String(res.error));
      return;
    }
    setEndOpen(false);
    setMsgs([]);
    lastIdRef.current = null;
    clearImage();
    setThread({
      ...thread,
      status: "closed",
      category: "",
      category_label: "—",
      category_detail: "",
      admin_joined: false,
      admin_joined_at: null,
    });
    joinedRef.current.delete(thread.id);
    fetchList();
  }

  function onPickImage(file: File | null) {
    if (!file) {
      clearImage();
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("Gambar maksimal 2 MB");
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

  const filters = [
    { key: "open", label: "Open" },
    { key: "closed", label: "Closed" },
    { key: "all", label: "Semua" },
  ];

  const sessionOpen = thread?.status === "open";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Live Chat</h1>
        <p className="text-sm text-slate-500">
          Balas pertanyaan & kendala pelanggan · Akhiri sesi = hapus seluruh riwayat
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <div className="kartu flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden !shadow-none">
          <form
            className="border-b border-black/5 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(qInput.trim());
            }}
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Cari nama / HP…"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-hijau/40"
            />
            <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-black/10 bg-white p-0.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatus(f.key);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    status === f.key ? "bg-hijau text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </form>

          <div className="flex-1 overflow-y-auto">
            {loading && !items.length && (
              <p className="p-4 text-center text-xs text-slate-400">Memuat…</p>
            )}
            {!loading && !items.length && (
              <p className="p-6 text-center text-xs text-slate-400">Belum ada percakapan</p>
            )}
            {items.map((t) => {
              const active = t.id === activeId;
              const label = t.user.name?.trim() || t.user.phone_number;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`w-full border-b border-black/5 px-3 py-3 text-left transition hover:bg-slate-50 ${
                    active ? "bg-emerald-50/60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{label}</p>
                      <p className="truncate text-[11px] text-slate-500">{t.user.phone_number}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400">{fmtTime(t.last_message_at)}</p>
                      {t.unread_admin > 0 && (
                        <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-hijau px-1 text-[10px] font-extrabold text-white">
                          {t.unread_admin}
                        </span>
                      )}
                    </div>
                  </div>
                  {t.category_label && t.category_label !== "—" && (
                    <p className="mt-1 truncate text-[10px] font-semibold text-emerald-700">
                      {t.category_label}
                      {t.admin_joined ? " · CS join" : ""}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-slate-500">{t.last_preview || "—"}</p>
                </button>
              );
            })}
          </div>

          {totalItems > 20 && (
            <div className="flex items-center justify-between gap-2 border-t border-black/5 p-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[11px] text-slate-500">
                {page}/{Math.max(1, Math.ceil(totalItems / 20))}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(totalItems / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="kartu flex max-h-[calc(100dvh-8rem)] min-h-[28rem] flex-col overflow-hidden !shadow-none">
          {!activeId || !thread ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-400">
              Pilih percakapan di kiri
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-black/5 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-800">
                    {thread.user.name?.trim() || thread.user.phone_number}
                  </p>
                  <p className="text-xs text-slate-500">{thread.user.phone_number}</p>
                  {sessionOpen && (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                      {thread.category_label}
                      {thread.category_detail ? ` · ${thread.category_detail}` : ""}
                    </p>
                  )}
                  {!sessionOpen && (
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">Sesi ditutup / belum dimulai</p>
                  )}
                </div>
                {sessionOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndOpen(true);
                      setErr("");
                    }}
                    className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    Akhiri sesi
                  </button>
                )}
              </div>

              {sessionOpen && thread.admin_joined && (
                <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-1.5 text-center text-[11px] font-semibold text-emerald-800">
                  Anda sudah bergabung — user mendapat pemberitahuan
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto bg-white p-4">
                {msgLoading && !msgs.length && (
                  <p className="py-10 text-center text-xs text-slate-400">Memuat pesan…</p>
                )}
                {!msgLoading && !msgs.length && (
                  <p className="py-10 text-center text-xs text-slate-400">
                    {sessionOpen ? "Belum ada pesan" : "Sesi ditutup — riwayat sudah dihapus"}
                  </p>
                )}
                {msgs.map((m) => {
                  if (m.sender_type === "system") {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="max-w-[90%] rounded-xl bg-slate-100 px-3 py-1.5 text-center text-[11px] text-slate-600">
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{fmtClock(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  }
                  const mine = m.sender_type === "admin";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? "rounded-br-md bg-hijau text-white"
                            : "rounded-bl-md border border-black/5 bg-slate-50 text-slate-800"
                        }`}
                      >
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.image_url}
                              alt="Lampiran chat"
                              loading="lazy"
                              className="max-h-52 w-full rounded-lg bg-black/5 object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                const fallback = el.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.hidden = false;
                              }}
                            />
                            <span hidden className="block rounded-lg border border-dashed border-black/20 bg-white px-2 py-3 text-center text-[11px] text-slate-500">
                              Gambar tidak bisa dimuat
                            </span>
                          </a>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {fmtClock(m.created_at)} · {mine ? "Admin" : "User"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {err && <p className="bg-red-50 px-4 py-1 text-xs text-red-600">{err}</p>}

              {imagePreview && (
                <div className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-black/10" />
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{image?.name}</p>
                  <button type="button" onClick={clearImage} className="text-xs font-bold text-red-600">
                    Hapus
                  </button>
                </div>
              )}

              {sessionOpen ? (
                <form onSubmit={onSend} className="flex gap-2 border-t border-black/5 p-3">
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
                    title="Lampirkan gambar (maks 2 MB)"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                    placeholder="Balas pelanggan…"
                    className="input min-w-0 flex-1 !text-slate-800 placeholder:!text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !image)}
                    className="btn-utama disabled:opacity-50"
                  >
                    Kirim
                  </button>
                </form>
              ) : (
                <div className="border-t border-black/5 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                  Sesi ditutup. User harus memulai sesi baru (dengan kategori) sebelum chat dilanjutkan.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* End confirm modal — z tinggi + center agar tidak tertutup nav/sidebar */}
      {endOpen && thread && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-end-chat-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl animate-slide-up"
          >
            <h3 id="admin-end-chat-title" className="text-base font-extrabold text-slate-800">
              Akhiri sesi chat?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Seluruh pesan dan gambar dengan{" "}
              <strong>{thread.user.name?.trim() || thread.user.phone_number}</strong> akan{" "}
              <strong className="text-red-700">dihapus permanen</strong>. User harus mulai sesi baru bila ingin chat lagi.
            </p>
            {err && endOpen && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEndOpen(false);
                  setErr("");
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
        </div>
      )}
    </div>
  );
}
