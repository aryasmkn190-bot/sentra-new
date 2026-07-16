"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getUsers, toggleUserStatus } from "@/actions/admin";
import { Pagination } from "@/components/Pagination";
import { UserModal } from "./UserModal";

const ITEMS_PER_PAGE = 20;

type UserItem = {
  id: string; name: string; phone_number: string; email: string | null;
  status: string; created_at: Date; is_age_verified: boolean;
  date_of_birth: Date | null; referral_code: string;
  _count: { orders: number };
};

type DataState = { items: UserItem[]; totalItems: number; currentPage: number } | null;

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getUsers(page, query || undefined, statusFilter || undefined);
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
    router.push(`/admin/pengguna?${params.toString()}`);
  };

  const handleFilter = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (query) params.set("q", query);
    router.push(`/admin/pengguna?${params.toString()}`);
  };

  const openEdit = (id: string) => { setEditId(id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditId(null); };
  const handleSuccess = () => { setModalOpen(false); setEditId(null); refresh(); };

  const handleToggle = async (id: string) => {
    setToggling(id);
    await toggleUserStatus(id);
    setToggling(null);
    refresh();
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  const fmtDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-slate-800">Daftar Pengguna</h1>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input name="q" defaultValue={query} placeholder="Cari nama, nomor HP, atau email..." className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none" />
        </form>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {(["all", "active", "blocked"] as const).map((s) => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${statusFilter === s ? "bg-hijau text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
              {s === "all" ? "Semua" : s === "active" ? "Aktif" : "Blocked"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
              <tr><th className="p-4">Nama</th><th className="p-4">Nomor HP</th><th className="p-4">Email</th><th className="p-4">Pesanan</th><th className="p-4">Bergabung</th><th className="p-4">Status</th><th className="p-4"></th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? Array.from({length:5}).map((_,i)=>
                <tr key={i}>{Array.from({length:7}).map((_,j)=><td key={j} className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100"/></td>)}</tr>
              ) :
              items.length===0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">Tidak ada user yang cocok.</td></tr> :
              items.map(u=>
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-slate-800">{u.name || "(tanpa nama)"}</p>
                    {u.is_age_verified && <span className="text-[10px] text-emerald-600 font-bold">✓ 18+</span>}
                  </td>
                  <td className="p-4 font-mono text-slate-600">{u.phone_number}</td>
                  <td className="p-4 text-slate-500">{u.email || "-"}</td>
                  <td className="p-4 text-center font-semibold text-slate-700">{u._count.orders}</td>
                  <td className="p-4 text-slate-500">{fmtDate(u.created_at)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status==="active"?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-red-50 text-red-700 border border-red-200"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={()=>openEdit(u.id)} className="text-hijau font-bold hover:underline mr-3">Ubah</button>
                    <button
                      onClick={()=>handleToggle(u.id)}
                      disabled={toggling===u.id}
                      className={`font-bold hover:underline ${u.status==="active"?"text-red-600":"text-emerald-600"}`}
                    >
                      {toggling===u.id ? "..." : u.status==="active"?"Block":"Aktifkan"}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
      <UserModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} userId={editId} />
    </div>
  );
}