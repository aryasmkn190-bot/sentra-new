"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upsertVoucher, getVoucherFormOptions } from "@/actions/admin";
import { DAY_NAMES, minuteToHHMM } from "@/lib/vouchers";
import { MultiSelect } from "@/components/admin/MultiSelect";

type Props = {
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  voucher?: any | null;
};

const toDateInput = (d: string | Date) =>
  new Date(d).toLocaleDateString("sv-SE"); // yyyy-mm-dd

export function VoucherForm({ inModal, onSuccess, onCancel, voucher }: Props) {
  const [state, action, pending] = useActionState(upsertVoucher, null);
  const isEdit = !!voucher;

  // Opsi ketentuan: kategori, produk, dan paket (fetch async — modal remount tiap open)
  const [options, setOptions] = useState<{ categories: any[]; products: any[]; bundles?: any[] } | null>(null);
  const [bundleOnly, setBundleOnly] = useState(voucher?.bundle_only ?? false);

  useEffect(() => {
    getVoucherFormOptions().then(setOptions);
  }, []);

  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const formContent = (
    <>
      {isEdit && <input type="hidden" name="id" value={voucher.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="code">Kode</label>
          <input id="code" name="code" className="input uppercase" placeholder="HEMAT10" required defaultValue={voucher?.code ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="type">Tipe</label>
          <select id="type" name="type" className="input" defaultValue={voucher?.type ?? "fixed"}>
            <option value="fixed">Nominal (Rp)</option>
            <option value="percentage">Persentase (%)</option>
            <option value="free_delivery">Gratis ongkir</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="name">Nama kampanye</label>
        <input id="name" name="name" className="input" required defaultValue={voucher?.name ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="value">Nilai (Rp atau %)</label>
          <input id="value" name="value" type="number" min="0" className="input" defaultValue={voucher?.value ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="max_discount">Maks. diskon (utk %)</label>
          <input id="max_discount" name="max_discount" type="number" min="0" className="input" defaultValue={voucher?.max_discount ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label" htmlFor="min_order_amount">Min. belanja</label><input id="min_order_amount" name="min_order_amount" type="number" min="0" defaultValue={voucher?.min_order_amount ?? 0} className="input" /></div>
        <div><label className="label" htmlFor="quota_total">Kuota total</label><input id="quota_total" name="quota_total" type="number" min="1" defaultValue={voucher?.quota_total ?? 100} className="input" /></div>
        <div><label className="label" htmlFor="quota_per_user">Kuota / user</label><input id="quota_per_user" name="quota_per_user" type="number" min="1" defaultValue={voucher?.quota_per_user ?? 1} className="input" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="target_segment">Segmen</label>
          <select id="target_segment" name="target_segment" className="input" defaultValue={voucher?.target_segment ?? "all"}>
            <option value="all">Semua</option>
            <option value="new_user">Pengguna baru</option>
          </select>
        </div>
        <div><label className="label" htmlFor="start_at">Mulai</label><input id="start_at" name="start_at" type="date" className="input" required defaultValue={voucher ? toDateInput(voucher.start_at) : ""} /></div>
        <div><label className="label" htmlFor="end_at">Berakhir</label><input id="end_at" name="end_at" type="date" className="input" required defaultValue={voucher ? toDateInput(voucher.end_at) : ""} /></div>
      </div>

      {/* ==== Ketentuan voucher (opsional) ==== */}
      <div className="rounded-2xl border border-black/10 bg-slate-50/60 p-3 space-y-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Ketentuan (opsional — kosong = berlaku untuk semua)</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kategori tertentu</label>
            <MultiSelect
              name="category_id"
              options={(options?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              defaultValue={voucher?.category_ids ?? []}
              placeholder="Pilih kategori…"
              emptyText="Tidak ada kategori aktif."
            />
            <p className="mt-1 text-[10px] text-slate-400">Kosongkan = berlaku untuk semua kategori.</p>
          </div>
          <div>
            <label className="label">Produk tertentu</label>
            <MultiSelect
              name="product_id"
              options={(options?.products ?? []).map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }))}
              defaultValue={voucher?.product_ids ?? []}
              placeholder="Cari & pilih produk…"
              emptyText="Tidak ada produk aktif."
            />
            <p className="mt-1 text-[10px] text-slate-400">Kosongkan = berlaku untuk semua produk.</p>
          </div>
        </div>

        {/* Khusus Paket Bundling */}
        <div className="rounded-xl border border-black/5 bg-white p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              name="bundle_only"
              checked={bundleOnly}
              onChange={(e) => setBundleOnly(e.target.checked)}
              className="accent-emerald-600 h-4 w-4"
            />
            🎁 Khusus Produk Paket / Bundling
          </label>
          <p className="text-[10px] text-slate-400">
            Centang jika voucher ini skemanya khusus potongan diskon pembelian paket hemat.
          </p>

          {bundleOnly && (
            <div className="pt-2">
              <label className="label">Pilih Paket Tertentu (Opsional)</label>
              <MultiSelect
                name="bundle_id"
                options={(options?.bundles ?? []).map((b: any) => ({
                  value: b.id,
                  label: b.name,
                }))}
                defaultValue={voucher?.bundle_ids ?? []}
                placeholder="Pilih paket bundling tertentu…"
                emptyText="Tidak ada paket bundling aktif."
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Kosongkan = berlaku untuk semua paket bundling.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="label">Hari tertentu</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_NAMES.map((dayName, idx) => (
              <label key={idx} className="flex cursor-pointer items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 has-[:checked]:border-hijau has-[:checked]:bg-hijau-muda has-[:checked]:text-hijau-tua">
                <input type="checkbox" name="day" value={idx} defaultChecked={(voucher?.days_of_week ?? []).includes(idx)} className="accent-emerald-600" />
                {dayName}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_time">Jam mulai</label>
            <input id="start_time" name="start_time" type="time" className="input" defaultValue={voucher?.start_minute != null ? minuteToHHMM(voucher.start_minute) : ""} />
          </div>
          <div>
            <label className="label" htmlFor="end_time">Jam selesai</label>
            <input id="end_time" name="end_time" type="time" className="input" defaultValue={voucher?.end_minute != null ? minuteToHHMM(voucher.end_minute) : ""} />
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Isi keduanya utk batasi jam (mis. 09:00 – 17:00). Jam selesai lebih awal = berlaku lintas tengah malam.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
        <input type="checkbox" name="is_active" defaultChecked={voucher ? voucher.is_active : true} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />
        Voucher aktif (bisa diklaim & dipakai di checkout)
      </label>
      {state && "error" in state && state.error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>}

      <div className="flex gap-2 pt-2">
        {inModal && onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
        ) : (
          <a href="/admin/voucher" className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</a>
        )}
        <button className="btn-utama flex-1" disabled={pending}>{pending ? "Menyimpan..." : isEdit ? "Simpan perubahan" : "Buat voucher"}</button>
      </div>
    </>
  );

  if (inModal) return <form action={action} className="space-y-3">{formContent}</form>;
  return <form action={action} className="kartu max-w-xl space-y-3 p-5">{formContent}</form>;
}
