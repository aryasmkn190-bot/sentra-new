"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getAdminBundles, deleteBundle } from "@/actions/bundle";
import { rupiah } from "@/lib/money";
import { BundleFormModal } from "./BundleFormModal";

export default function AdminBundlingPage() {
  const [data, setData] = useState<{ bundles: any[]; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [pending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getAdminBundles();
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (bundle: any) => {
    setEditTarget(bundle);
    setModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus paket bundling "${name}"?`)) return;
    startTransition(async () => {
      await deleteBundle(id);
      loadData();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Produk Bundling / Paket</h1>
          <p className="text-xs text-slate-500">
            Kelola paket hemat produk. Paket bundling memotong stok produk satuan secara otomatis.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-utama !px-4 !py-2 !text-sm"
        >
          + Tambah Paket
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Paket</th>
              <th className="p-3">Komponen Produk</th>
              <th className="p-3">Harga Paket</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Memuat data paket…
                </td>
              </tr>
            ) : !data || data.bundles.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Belum ada paket bundling. Klik "+ Tambah Paket" untuk membuat paket pertama.
                </td>
              </tr>
            ) : (
              data.bundles.map((bundle) => {
                const totalNormal = bundle.items.reduce(
                  (sum: number, i: any) =>
                    sum + (i.variant?.base_price || i.product?.base_price || 0) * i.qty,
                  0
                );
                const hemat = totalNormal > bundle.price ? totalNormal - bundle.price : 0;

                return (
                  <tr key={bundle.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-amber-50 flex items-center justify-center border border-black/5">
                          {bundle.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={bundle.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{bundle.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            /{bundle.slug}
                          </p>
                          {bundle.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                              {bundle.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {bundle.items.map((i: any) => (
                          <div key={i.id} className="text-xs text-slate-700">
                            • <span className="font-semibold">{i.product.name}</span>{" "}
                            <span className="font-extrabold text-[#A00000]">
                              × {i.qty} pcs
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-extrabold tabular-nums text-slate-900">
                        {rupiah(bundle.price)}
                      </p>
                      {bundle.compare_at_price && (
                        <p className="text-[11px] text-slate-400 line-through tabular-nums">
                          {rupiah(bundle.compare_at_price)}
                        </p>
                      )}
                      {hemat > 0 && (
                        <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 mt-0.5">
                          Hemat {rupiah(hemat)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          bundle.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {bundle.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(bundle)}
                          className="btn-garis !px-2.5 !py-1 !text-xs"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bundle.id, bundle.name)}
                          disabled={pending}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold text-merah hover:bg-red-50 disabled:opacity-40"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <BundleFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            loadData();
          }}
          bundle={editTarget}
          products={data?.products || []}
        />
      )}
    </div>
  );
}
