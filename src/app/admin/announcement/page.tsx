"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAnnouncements } from "@/actions/announcements";
import type { AnnouncementData as AnnouncementItem } from "@/actions/announcements";
import { Pagination } from "@/components/Pagination";
import { AnnouncementModal } from "./AnnouncementModal";

const ITEMS_PER_PAGE = 20;

type DataState = {
  items: AnnouncementItem[];
  totalItems: number;
  currentPage: number;
} | null;

export default function AdminAnnouncementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementItem | null>(null);

  // Sync state from URL search params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const prevParams = useRef({ page, query, statusFilter });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getAnnouncements(query || undefined, statusFilter || undefined, page);
    setData(result as DataState);
    setLoading(false);
  }, [page, query, statusFilter]);

  useEffect(() => {
    prevParams.current = { page, query, statusFilter };
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Search submit
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = String(formData.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    router.push(`/admin/announcement?${params.toString()}`);
  };

  // Filter change
  const handleFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (query) params.set("q", query);
    router.push(`/admin/announcement?${params.toString()}`);
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (item: AnnouncementItem) => {
    setEditTarget(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditTarget(null);
    refresh();
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Pengumuman</h1>
        <button
          onClick={openCreate}
          className="btn-utama !px-4 !py-2 text-xs font-bold shadow-sm hover:shadow transition-shadow"
        >
          + Buat Pengumuman
        </button>
      </div>

      {/* Search + Filter */}
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
            placeholder="Cari judul atau isi pengumuman..."
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none"
          />
        </form>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                statusFilter === s
                  ? "bg-hijau text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "Semua" : s === "active" ? "Aktif" : "Nonaktif"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-black/5 font-bold text-slate-500">
              <tr>
                <th className="p-4 w-[80px]">Tipe</th>
                <th className="p-4">Judul</th>
                <th className="p-4">Isi</th>
                <th className="p-4 w-[120px]">Link Target</th>
                <th className="p-4 w-[90px]">Status</th>
                <th className="p-4 w-[100px]">Dibuat</th>
                <th className="p-4 w-[70px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-4"><div className="h-5 w-14 animate-pulse rounded bg-slate-100" /></td>
                    <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-100" /></td>
                    <td className="p-4"><div className="h-4 w-48 animate-pulse rounded bg-slate-100" /></td>
                    <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100" /></td>
                    <td className="p-4"><div className="h-5 w-12 animate-pulse rounded-full bg-slate-100" /></td>
                    <td className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-100" /></td>
                    <td className="p-4" />
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    {query || statusFilter !== "all"
                      ? "Tidak ada pengumuman yang cocok dengan filter."
                      : "Belum ada pengumuman. Klik \"+ Buat Pengumuman\" untuk memulai."}
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          a.type === "promo"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : a.type === "discount"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : a.type === "release"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : a.type === "warning"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 whitespace-nowrap max-w-[180px] truncate">
                      {a.title}
                    </td>
                    <td className="p-4 text-slate-500 max-w-[280px] truncate">{a.body}</td>
                    <td className="p-4 text-slate-400 font-mono text-[10px] truncate max-w-[120px]">
                      {a.target_url || "\u2014"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          a.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {a.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-hijau font-bold hover:underline"
                      >
                        Ubah
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

      {/* Modal */}
      <AnnouncementModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        announcement={editTarget}
      />
    </div>
  );
}
