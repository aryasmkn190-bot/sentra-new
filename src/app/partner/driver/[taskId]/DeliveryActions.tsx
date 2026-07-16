"use client";

import { useState, useTransition } from "react";
import { updateDeliveryStatus } from "@/actions/partner";

export function DeliveryActions({ taskId, status }: { taskId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");

  const run = (action: "picked_up" | "arrived" | "delivered") => {
    setError(null);
    startTransition(async () => {
      const res = await updateDeliveryStatus(taskId, action, action === "delivered" ? proofUrl : undefined);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-2">
      {status === "assigned" && (
        <button className="btn-utama w-full" disabled={pending} onClick={() => run("picked_up")}>
          📦 Paket sudah di tangan — berangkat
        </button>
      )}
      {status === "on_the_way" && (
        <button className="btn-utama w-full" disabled={pending} onClick={() => run("arrived")}>
          📍 Tiba di lokasi pelanggan
        </button>
      )}
      {["arrived", "on_the_way"].includes(status) && (
        <div className="kartu space-y-2 p-3">
          <label className="label" htmlFor="proof">URL foto bukti pengiriman</label>
          <input
            id="proof"
            className="input"
            placeholder="https://… (unggah via app kamera hub)"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
          />
          <button className="btn-utama w-full" disabled={pending} onClick={() => run("delivered")}>
            ✅ Selesai — pesanan diterima
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-merah">{error}</p>}
    </div>
  );
}
