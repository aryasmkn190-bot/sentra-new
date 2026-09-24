"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getVouchers, deleteVoucher } from "@/actions/admin";
import { rupiah } from "@/lib/money";
import { formatRestriction } from "@/lib/vouchers";
import { Pagination } from "@/components/Pagination";
import { VoucherModal } from "./VoucherModal";

const ITEMS_PER_PAGE = 20;

export default function VouchersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editV, setEditV] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getVouchers(page, query || undefined);
    setData(result);
    setLoading(false);
  }, [page, query]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const refresh = useCallback(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`/admin/voucher?${params.toString()}`);
  };

  const openCreate = () => { setEditV(null); setModalOpen(true); };
  const openEdit = (v: any) => { setEditV(v); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditV(null); };
  const handleSuccess = () => { setModalOpen(false); setEditV(null); refresh(); };

  const handleDelete = async (v: any) => {
    if (!confirm(`Yakin hapus voucher ${v.code} (${v.name})?`)) return;
    setDeleting(v.id);
    const res = await deleteVoucher(v.id);
    if (res && "error" in res && res.error) alert(res.error);
    setDeleting(null);
    refresh();
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Voucher</h1>
        <button onClick={openCreate} className="btn-utama !py-2 !px-4 text-xs font-bold shadow-sm hover:shadow transition-shadow">+ Voucher baru</button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input name="q" defaultValue={query} placeholder="Cari kode atau nama voucher..." className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none" />
      </form>

      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-black/5 font-bold text-slate-500">
              <tr><th className="p-4">Kode</th><th className="p-4">Nama</th><th className="p-4">Nilai</th><th className="p-4 text-right">Terpakai / Kuota</th><th className="p-4">Segmen</th><th className="p-4">Berlaku s.d.</th><th className="p-4">Ketentuan</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:9}).map((_,j)=><td key={j} className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100"/></td>)}</tr>) :
              items.length===0 ? <tr><td colSpan={9} className="p-6 text-center text-slate-400">Tidak ada voucher yang cocok.</td></tr> :
              items.map((v:any)=><tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-mono font-bold text-slate-800">{v.code}</td>
                <td className="p-4 font-semibold text-slate-800">{v.name}</td>
                <td className="p-4 text-slate-600 font-semibold">{v.type==="fixed"?rupiah(v.value):v.type==="percentage"?`${v.value}%${v.max_discount?` (maks ${rupiah(v.max_discount)})`:""}`:"Gratis ongkir"}</td>
                <td className="p-4 text-right font-semibold tabular-nums text-slate-700">{v._count.usages} / {v.quota_total}</td>
                <td className="p-4 text-slate-500">{v.target_segment==="new_user"?"Pengguna baru":"Semua"}</td>
                <td className="p-4 text-slate-500">{new Date(v.end_at).toLocaleDateString("id-ID")}</td>
                <td className="p-4 text-slate-500 max-w-[200px]">{formatRestriction(v) ?? <span className="text-slate-300">Semua</span>}</td>
                <td className="p-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${v.is_active?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-slate-100 text-slate-500 border border-slate-200"}`}>{v.is_active?"Aktif":"Nonaktif"}</span></td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={()=>openEdit(v)} className="font-semibold text-hijau hover:underline">Edit</button>
                  <button onClick={()=>handleDelete(v)} disabled={deleting===v.id} className="rounded bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">{deleting===v.id?"...":"Hapus"}</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
      <VoucherModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} voucher={editV} />
    </div>
  );
}
