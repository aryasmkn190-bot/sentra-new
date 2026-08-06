"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProducts } from "@/actions/admin";
import { rupiah } from "@/lib/money";
import { Pagination } from "@/components/Pagination";
import { ProductModal } from "./ProductModal";
import { StockModal } from "./StockModal";
import { PriceModal } from "./PriceModal";

const ITEMS_PER_PAGE = 20;

type VariantBrief = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  base_price: number;
  is_default: boolean;
  is_active: boolean;
  stock_qty: number;
  reserved_qty: number;
};

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  base_price: number;
  min_price?: number;
  max_price?: number;
  compare_at_price: number | null;
  status: string;
  category: { name: string };
  image_url: string | null;
  sold_count: number;
  rating_avg: number;
  rating_count: number;
  variant_count?: number;
  total_stock?: number;
  variants?: VariantBrief[];
};

type DataState = { items: ProductItem[]; totalItems: number; currentPage: number } | null;

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DataState>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceProductId, setPriceProductId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getProducts(page, query || undefined, statusFilter || undefined);
    setData(result as DataState);
    setLoading(false);
  }, [page, query, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    router.push(`/admin/produk?${params.toString()}`);
  };

  const handleFilter = (s: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (query) params.set("q", query);
    router.push(`/admin/produk?${params.toString()}`);
  };

  const openCreate = () => {
    setEditId(null);
    setModalOpen(true);
  };
  const openEdit = (id: string) => {
    setEditId(id);
    setModalOpen(true);
  };
  const openStock = (id: string) => {
    setStockProductId(id);
    setStockOpen(true);
  };
  const openPrice = (id: string) => {
    setPriceProductId(id);
    setPriceOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };
  const handleSuccess = () => {
    setModalOpen(false);
    setEditId(null);
    refresh();
  };
  const handleStockSuccess = () => {
    setStockOpen(false);
    setStockProductId(null);
    refresh();
  };
  const handlePriceSuccess = () => {
    setPriceOpen(false);
    setPriceProductId(null);
    refresh();
  };

  const toggleExpand = (id: string) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.currentPage ?? page;

  const priceLabel = (p: ProductItem) => {
    const min = p.min_price ?? p.base_price;
    const max = p.max_price ?? p.base_price;
    if (min === max) return rupiah(min);
    return `${rupiah(min)} - ${rupiah(max)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Daftar Produk</h1>
        <button
          onClick={openCreate}
          className="btn-utama !py-2 !px-4 text-xs font-bold shadow-sm hover:shadow transition-shadow"
        >
          + Tambah Produk
        </button>
      </div>

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
            placeholder="Cari nama produk atau SKU..."
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-hijau focus:ring-2 focus:ring-hijau/20 focus:outline-none"
          />
        </form>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-0.5">
          {(["all", "active", "inactive", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                statusFilter === s
                  ? "bg-hijau text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "Semua" : s === "active" ? "Aktif" : s === "inactive" ? "Nonaktif" : "Arsip"}
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
                <th className="p-4 text-right">Harga</th>
                <th className="p-4 text-right">Stok</th>
                <th className="p-4 text-right">Terjual</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Tidak ada produk yang cocok.
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const multi = (p.variant_count ?? 0) > 1;
                  const open = !!expanded[p.id];
                  const stock = p.total_stock ?? 0;
                  return (
                    <Fragment key={p.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-black/5">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg">🛒</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 leading-snug">{p.name}</p>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                SKU: {p.sku} · {p.category.name}
                                {multi ? ` · ${p.variant_count} varian` : ""}
                              </p>
                              {multi && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(p.id)}
                                  className="mt-1 text-[10px] font-bold text-hijau hover:underline"
                                >
                                  {open ? "Sembunyikan varian" : `Lihat semua (${p.variant_count} SKU)`}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openPrice(p.id)}
                            className="font-semibold tabular-nums text-slate-700 hover:underline"
                            title="Atur harga"
                          >
                            {priceLabel(p)}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openStock(p.id)}
                            className={`font-extrabold tabular-nums hover:underline ${
                              stock === 0 ? "text-merah" : "text-slate-800"
                            }`}
                            title="Atur stok"
                          >
                            {stock === 0 ? "0 Habis" : stock.toLocaleString("id-ID")}
                          </button>
                        </td>
                        <td className="p-4 text-right font-semibold tabular-nums text-slate-700">
                          {p.sold_count ?? 0}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="text-hijau font-bold hover:underline"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => openPrice(p.id)}
                              className="text-orange-600 font-bold hover:underline"
                            >
                              Atur Harga
                            </button>
                            <button
                              type="button"
                              onClick={() => openStock(p.id)}
                              className="text-slate-600 font-bold hover:underline"
                            >
                              Atur Stok
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open &&
                        (p.variants ?? []).map((v) => (
                          <tr key={v.id} className="bg-slate-50/70">
                            <td className="px-4 py-2 pl-20">
                              <p className="font-semibold text-slate-700">{v.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {v.sku}
                                {!v.is_active ? " · nonaktif" : ""}
                                {v.is_default ? " · default" : ""}
                              </p>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              <button
                                type="button"
                                onClick={() => openPrice(p.id)}
                                className="font-semibold text-slate-600 hover:underline"
                              >
                                {rupiah(v.base_price)}
                              </button>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              <button
                                type="button"
                                onClick={() => openStock(p.id)}
                                className={
                                  v.stock_qty === 0
                                    ? "font-bold text-merah hover:underline"
                                    : "font-bold text-slate-700 hover:underline"
                                }
                              >
                                {v.stock_qty === 0 ? "0 Habis" : v.stock_qty}
                              </button>
                            </td>
                            <td className="px-4 py-2" colSpan={3} />
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>

      <ProductModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} productId={editId} />
      <StockModal
        open={stockOpen}
        productId={stockProductId}
        onClose={() => {
          setStockOpen(false);
          setStockProductId(null);
        }}
        onSuccess={handleStockSuccess}
      />
      <PriceModal
        open={priceOpen}
        productId={priceProductId}
        onClose={() => {
          setPriceOpen(false);
          setPriceProductId(null);
        }}
        onSuccess={handlePriceSuccess}
      />
    </div>
  );
}
