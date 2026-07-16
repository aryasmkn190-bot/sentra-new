"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCategory, getCategoryList } from "./actions";
import { Pagination } from "@/components/Pagination";
import { CategoryModal } from "./CategoryModal";

const ITEMS_PER_PAGE = 20;

type CatItem = { id: string; name: string; slug: string; icon: string; image_url: string | null; sort_order: number; is_active: boolean };
type DataState = { items: CatItem[]; totalItems: number; currentPage: number } | null;

export default function AdminCategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<CatItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getCategoryList(page, query || undefined, statusFilter || undefined);
    setData(result as DataState);
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
    router.push(`/admin/kategori?${params.toString()}`);
  };

  const handleFilter = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (query) params.set("q", query);
    router.push(`/admin/kategori?${params.toString()}`);
  };

  const openCreate = () => { setEditCat(null); setModalOpen(true); };
  const openEdit = (c: CatItem) => { setEditCat(c); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditCat(null); };
  const handleSuccess = () => { setModalOpen(false); setEditCat(null); refresh(); };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus kategori ${name}?`)) return;
    setDeleting(id);
    await deleteCategory(id);
    setDeleting(null);
    refresh();
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Kategori Produk</h1>
        <button onClick={openCreate} className="btn-utama !py-2 !px-4 text-xs font-bold shadow-sm hover:shadow transition-shadow">+ Tambah Kategori</button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input name="q" defaultValue={query} placeholder="Cari nama atau slug kategori..." className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none" />
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
              <tr><th className="p-4">#</th><th className="p-4">Icon</th><th className="p-4">Nama</th><th className="p-4">Slug</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:6}).map((_,j)=><td key={j} className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100"/></td>)}</tr>) :
              items.length===0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-400">Tidak ada kategori yang cocok.</td></tr> :
              items.map(c=><tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-semibold text-slate-500">{c.sort_order}</td>
                <td className="p-4">{c.image_url?<img src={c.image_url} alt={c.name} className="h-10 w-10 rounded-md object-cover border border-black/5"/>:<span className="text-2xl">{c.icon}</span>}</td>
                <td className="p-4 font-bold text-slate-800">{c.name}</td>
                <td className="p-4 text-slate-500">{c.slug}</td>
                <td className="p-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-slate-100 text-slate-500 border border-slate-200"}`}>{c.is_active?"Aktif":"Nonaktif"}</span></td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={()=>openEdit(c)} className="font-semibold text-hijau hover:underline">Edit</button>
                  <button onClick={()=>handleDelete(c.id,c.name)} disabled={deleting===c.id} className="rounded bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">Hapus</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
      <CategoryModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} category={editCat} />
    </div>
  );
}
