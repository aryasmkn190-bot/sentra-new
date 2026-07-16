"use client";

import { useActionState, useEffect, useRef } from "react";
import { createVoucher } from "@/actions/admin";

type Props = {
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function VoucherForm({ inModal, onSuccess, onCancel }: Props) {
  const [state, action, pending] = useActionState(createVoucher, null);

  const successCalled = useRef(false);
  useEffect(() => {
    if (state && "ok" in state && state.ok && onSuccess && !successCalled.current) {
      successCalled.current = true;
      setTimeout(() => onSuccess(), 100);
    }
  }, [state, onSuccess]);

  const formContent = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="code">Kode</label>
          <input id="code" name="code" className="input uppercase" placeholder="HEMAT10" required />
        </div>
        <div>
          <label className="label" htmlFor="type">Tipe</label>
          <select id="type" name="type" className="input">
            <option value="fixed">Nominal (Rp)</option>
            <option value="percentage">Persentase (%)</option>
            <option value="free_delivery">Gratis ongkir</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="name">Nama kampanye</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="value">Nilai (Rp atau %)</label>
          <input id="value" name="value" type="number" min="0" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="max_discount">Maks. diskon (utk %)</label>
          <input id="max_discount" name="max_discount" type="number" min="0" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label" htmlFor="min_order_amount">Min. belanja</label><input id="min_order_amount" name="min_order_amount" type="number" min="0" defaultValue={0} className="input" /></div>
        <div><label className="label" htmlFor="quota_total">Kuota total</label><input id="quota_total" name="quota_total" type="number" min="1" defaultValue={100} className="input" /></div>
        <div><label className="label" htmlFor="quota_per_user">Kuota / user</label><input id="quota_per_user" name="quota_per_user" type="number" min="1" defaultValue={1} className="input" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="target_segment">Segmen</label>
          <select id="target_segment" name="target_segment" className="input">
            <option value="all">Semua</option>
            <option value="new_user">Pengguna baru</option>
          </select>
        </div>
        <div><label className="label" htmlFor="start_at">Mulai</label><input id="start_at" name="start_at" type="date" className="input" required /></div>
        <div><label className="label" htmlFor="end_at">Berakhir</label><input id="end_at" name="end_at" type="date" className="input" required /></div>
      </div>
      {state && "error" in state && state.error && <p className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-merah">{state.error}</p>}

      <div className="flex gap-2 pt-2">
        {inModal && onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
        ) : (
          <a href="/admin/voucher" className="inline-flex items-center rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</a>
        )}
        <button className="btn-utama flex-1" disabled={pending}>{pending ? "Menyimpan..." : "Buat voucher"}</button>
      </div>
    </>
  );

  if (inModal) return <form action={action} className="space-y-3">{formContent}</form>;
  return <form action={action} className="kartu max-w-xl space-y-3 p-5">{formContent}</form>;
}
