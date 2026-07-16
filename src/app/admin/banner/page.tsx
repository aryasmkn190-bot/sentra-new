"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBanners } from "@/actions/admin";
import { Pagination } from "@/components/Pagination";
import { BannerModal } from "./BannerModal";

const ITEMS_PER_PAGE = 20;

type BannerItem = {
  id: string; title: string; image_url: string; target_url: string;
  placement: string; sort_order: number; start_at: Date; end_at: Date; is_active: boolean;
};

export default function AdminBannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<BannerItem | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getBanners(page, query || undefined, statusFilter || undefined);
    setData(result);
    setLoading(false);
  }, [page, query, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const refresh = useCallback(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    router.push(`/admin/banner?${params.toString()}`);
  };

  const handleFilter = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (query) params.set("q", query);
    router.push(`/admin/banner?${params.toString()}`);
  };

  const openCreate = () => { setEditBanner(null); setModalOpen(true); };
  const openEdit = (b: BannerItem) => { setEditBanner(b); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditBanner(null); };
  const handleSuccess = () => { setModalOpen(false); setEditBanner(null); refresh(); };

  const items: BannerItem[] = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Kelola Banner Promosi</h1>
        <button onClick={openCreate} className="btn-utama !px-4 !py-2 text-xs font-bold shadow-sm hover:shadow transition-shadow">+ Banner Baru</button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input name="q" defaultValue={query} placeholder="Cari judul banner..." className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none" />
        </form>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${statusFilter === s ? "bg-hijau text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
              {s === "all" ? "Semua" : s === "active" ? "Aktif" : "Nonaktif"}
            </button>
          ))}
        </div>
      </div>

      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-black/5 font-bold text-slate-500">
              <tr><th className="p-4">Urutan</th><th className="p-4">Judul & Gambar</th><th className="p-4">Tautan Target</th><th className="p-4">Status</th><th className="p-4">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:5}).map((_,j)=><td key={j} className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100"/></td>)}</tr>) :
              items.length===0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-400">Tidak ada banner yang cocok.</td></tr> :
              items.map(b=><tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-semibold text-slate-500">{b.sort_order}</td>
                <td className="p-4"><div><p className="font-bold text-slate-800">{b.title}</p>{b.image_url&&<img src={b.image_url} alt={b.title} className="mt-1 h-12 w-28 rounded object-cover border border-black/10"/>}</div></td>
                <td className="p-4 text-slate-500 font-mono">{b.target_url}</td>
                <td className="p-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${b.is_active?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-slate-100 text-slate-500 border border-slate-200"}`}>{b.is_active?"Aktif":"Non-aktif"}</span></td>
                <td className="p-4"><button onClick={()=>openEdit(b)} className="text-hijau font-bold hover:underline">Edit</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
      <BannerModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} banner={editBanner} />
    </div>
  );
}
