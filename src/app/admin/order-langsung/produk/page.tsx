"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteDirectProduct,
  getDirectProductQrDataUrl,
  getDirectProducts,
  regenerateDirectQr,
  upsertDirectProduct,
} from "@/actions/direct-order";
import { rupiah } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_qty: number;
  reserved_qty: number;
  available: number;
  image_url: string | null;
  sku: string | null;
  qr_token: string;
  qr_url: string;
  is_active: boolean;
};

const emptyForm = {
  id: "",
  name: "",
  description: "",
  price: "",
  stock_qty: "0",
  image_url: "",
  sku: "",
  is_active: true,
};

export default function AdminDirectProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [qr, setQr] = useState<{ name: string; url: string; dataUrl: string; price: number } | null>(null);

  const load = useCallback(async (query = q) => {
    setLoading(true);
    const res = await getDirectProducts(1, query);
    setItems((res?.items as Product[]) ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setMsg(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock_qty: String(p.stock_qty),
      image_url: p.image_url || "",
      sku: p.sku || "",
      is_active: p.is_active,
    });
    setMsg(null);
    setOpen(true);
  };

  const save = () => {
    start(async () => {
      const fd = new FormData();
      if (form.id) fd.set("id", form.id);
      fd.set("name", form.name);
      fd.set("description", form.description);
      fd.set("price", form.price);
      fd.set("stock_qty", form.stock_qty);
      fd.set("image_url", form.image_url);
      fd.set("sku", form.sku);
      fd.set("is_active", form.is_active ? "true" : "false");
      const res = await upsertDirectProduct(null, fd);
      if (res && "error" in res && res.error) {
        setMsg(res.error);
        return;
      }
      setOpen(false);
      await load();
    });
  };

  const showQr = (id: string) => {
    start(async () => {
      const res = await getDirectProductQrDataUrl(id);
      if (!res || "error" in res) {
        setMsg(("error" in (res || {}) && res?.error) || "Gagal buat QR");
        return;
      }
      setQr({ name: res.name!, url: res.url!, dataUrl: res.dataUrl!, price: res.price! });
    });
  };

  const rotateQr = (id: string) => {
    if (!confirm("Regenerate QR? QR lama tidak akan terbaca lagi.")) return;
    start(async () => {
      const res = await regenerateDirectQr(id);
      if (res && "error" in res && res.error) {
        setMsg(res.error);
        return;
      }
      await load();
      if (res && "ok" in res) showQr(id);
    });
  };

  const remove = (id: string) => {
    if (!confirm("Hapus / nonaktifkan produk ini?")) return;
    start(async () => {
      const res = await deleteDirectProduct(id);
      if (res && "error" in res && res.error) {
        setMsg(res.error);
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Produk Order Langsung</h1>
          <p className="text-xs text-slate-500">Katalog terpisah + QR per produk. Tidak digabung dengan Produk online.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-utama !px-4 !py-2 !text-sm">
          + Tambah produk
        </button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input
          className="input max-w-sm"
          placeholder="Cari nama / SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn-garis !px-4 !py-2 !text-sm">
          Cari
        </button>
      </form>

      {msg && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-merah">{msg}</p>}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Stok</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Memuat…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Belum ada produk. Tambah dulu, lalu cetak QR.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-lg">📦</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.sku || "—"} · token {p.qr_token.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold tabular-nums">{rupiah(p.price)}</td>
                  <td className="p-3 tabular-nums">
                    {p.available}
                    <span className="text-xs text-slate-400"> / {p.stock_qty}</span>
                    {p.reserved_qty > 0 && (
                      <span className="ml-1 text-[10px] text-amber-600">({p.reserved_qty} reserve)</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button type="button" onClick={() => showQr(p.id)} className="btn-garis !px-2.5 !py-1 !text-xs">
                        QR
                      </button>
                      <button type="button" onClick={() => openEdit(p)} className="btn-garis !px-2.5 !py-1 !text-xs">
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateQr(p.id)}
                        className="btn-garis !px-2.5 !py-1 !text-xs"
                        disabled={pending}
                      >
                        Rotate QR
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-merah hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-lg font-extrabold">{form.id ? "Ubah produk" : "Tambah produk"}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Nama</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  className="input min-h-[72px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Harga (Rp)</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Stok</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">SKU (opsional)</label>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <label className="label">URL foto</label>
                <input
                  className="input"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Aktif (bisa di-scan)
              </label>
              {msg && <p className="text-sm font-semibold text-merah">{msg}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-garis !px-4 !py-2" onClick={() => setOpen(false)}>
                  Batal
                </button>
                <button type="button" className="btn-utama !px-4 !py-2" disabled={pending} onClick={save}>
                  {pending ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQr(null)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
            id="direct-qr-print"
          >
            <h3 className="font-extrabold text-slate-900">{qr.name}</h3>
            <p className="mb-3 text-sm font-bold text-[#A00000]">{rupiah(qr.price)}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.dataUrl} alt="QR" className="mx-auto h-56 w-56" />
            <p className="mt-2 break-all text-[10px] text-slate-400">{qr.url}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a href={qr.dataUrl} download={`qr-${qr.name}.png`} className="btn-utama !px-4 !py-2 !text-sm">
                Unduh PNG
              </a>
              <button
                type="button"
                className="btn-garis !px-4 !py-2 !text-sm"
                onClick={() => window.print()}
              >
                Cetak
              </button>
              <button type="button" className="btn-garis !px-4 !py-2 !text-sm" onClick={() => setQr(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
