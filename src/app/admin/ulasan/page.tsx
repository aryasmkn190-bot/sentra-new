"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAdminProductReviews,
  toggleProductReviewVisibility,
  replyProductReview,
  deleteProductReview,
} from "@/actions/reviews";
import { Pagination } from "@/components/Pagination";

const ITEMS_PER_PAGE = 20;

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  product: { id: string; name: string; sku: string; slug: string };
  user: { id: string; name: string; phone_number: string };
};

type DataState = { items: ReviewItem[]; totalItems: number; currentPage: number } | null;

export default function AdminReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const visFilter = searchParams.get("vis") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getAdminProductReviews(page, query || undefined, visFilter || undefined);
    setData(result as DataState);
    setLoading(false);
  }, [page, query, visFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (visFilter !== "all") params.set("vis", visFilter);
    router.push(`/admin/ulasan?${params.toString()}`);
  };

  const handleFilter = (v: string) => {
    const params = new URLSearchParams();
    if (v !== "all") params.set("vis", v);
    if (query) params.set("q", query);
    router.push(`/admin/ulasan?${params.toString()}`);
  };

  const onToggle = async (id: string) => {
    setBusyId(id);
    setMsg(null);
    const res = await toggleProductReviewVisibility(id);
    setBusyId(null);
    if (res.error) setMsg(res.error);
    else {
      setMsg(res.is_visible ? "Ulasan ditampilkan." : "Ulasan disembunyikan.");
      fetchData();
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus ulasan ini permanen?")) return;
    setBusyId(id);
    setMsg(null);
    const res = await deleteProductReview(id);
    setBusyId(null);
    if (res.error) setMsg(res.error);
    else {
      setMsg("Ulasan dihapus.");
      fetchData();
    }
  };

  const onReply = async (id: string) => {
    setBusyId(id);
    setMsg(null);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("admin_reply", replyDraft[id] ?? "");
    const res = await replyProductReview(null, fd);
    setBusyId(null);
    if (res.error) setMsg(res.error);
    else {
      setMsg("Balasan disimpan.");
      fetchData();
    }
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Ulasan Produk</h1>
          <p className="text-xs font-semibold text-tinta/50">Kelola rating & ulasan pembeli</p>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {msg}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            name="q"
            defaultValue={query}
            placeholder="Cari produk, pembeli, atau isi ulasan..."
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none"
          />
        </form>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {([
            ["all", "Semua"],
            ["visible", "Tampil"],
            ["hidden", "Sembunyi"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => handleFilter(v)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                visFilter === v ? "bg-hijau text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4">Pembeli</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Ulasan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Belum ada ulasan.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{r.product.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{r.product.sku}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-700">{r.user.name || "—"}</p>
                      <p className="text-[10px] text-slate-400">{r.user.phone_number}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(r.created_at).toLocaleString("id-ID")}
                      </p>
                    </td>
                    <td className="p-4 font-bold text-amber-600">{"⭐".repeat(r.rating)}</td>
                    <td className="p-4 max-w-xs">
                      <p className="text-slate-700">{r.comment || <span className="text-slate-400 italic">Tanpa komentar</span>}</p>
                      {r.admin_reply && (
                        <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-600 ring-1 ring-black/5">
                          <span className="font-bold text-hijau">Balasan: </span>
                          {r.admin_reply}
                        </p>
                      )}
                      <div className="mt-2 flex gap-1">
                        <input
                          value={replyDraft[r.id] ?? r.admin_reply ?? ""}
                          onChange={(e) => setReplyDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          placeholder="Balas ulasan..."
                          className="input !py-1.5 !text-[11px] flex-1"
                        />
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => onReply(r.id)}
                          className="rounded-lg bg-hijau px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                        >
                          Simpan
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          r.is_visible
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {r.is_visible ? "Tampil" : "Sembunyi"}
                      </span>
                    </td>
                    <td className="p-4 space-y-1">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => onToggle(r.id)}
                        className="block text-hijau font-bold hover:underline disabled:opacity-50"
                      >
                        {r.is_visible ? "Sembunyikan" : "Tampilkan"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => onDelete(r.id)}
                        className="block text-merah font-bold hover:underline disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
    </div>
  );
}
