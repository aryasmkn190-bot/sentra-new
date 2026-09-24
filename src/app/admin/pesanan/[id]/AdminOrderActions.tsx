"use client";

import { useEffect, useState, useTransition } from "react";
import { adminSetOrderStatus, processRefund } from "@/actions/admin";
import { STATUS_LABEL } from "@/lib/order-status";

const OPTIONS = [
  "pending_payment",
  "confirmed",
  "picking",
  "packed",
  "on_delivery",
  "arrived",
  "completed",
  "cancelled",
  "refunded",
] as const;

export function StatusOverride({
  orderId,
  current,
  onDone,
}: {
  orderId: string;
  current: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState(current);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(current);
  }, [current]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input !w-48 !py-2 text-xs"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <button
        className="btn-garis !px-3 !py-2 !text-xs"
        disabled={pending || status === current}
        onClick={() =>
          startTransition(async () => {
            await adminSetOrderStatus(orderId, status);
            onDone?.();
          })
        }
      >
        {pending ? "…" : "Override status"}
      </button>
    </div>
  );
}

export function ProcessRefundButton({
  refundId,
  onDone,
}: {
  refundId: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-utama !px-3 !py-1.5 !text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await processRefund(refundId);
          onDone?.();
        })
      }
    >
      {pending ? "…" : "Proses refund"}
    </button>
  );
}
