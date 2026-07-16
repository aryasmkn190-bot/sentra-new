"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/actions/checkout";

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);

  if (state?.ok) {
    return <p className="rounded-xl bg-hijau-muda p-3 text-sm font-bold text-hijau-tua">Terima kasih atas penilaianmu! 💚</p>;
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-sm font-extrabold">Bagaimana pesananmu?</p>
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} bintang`}>
            <span className={n <= rating ? "" : "grayscale opacity-40"}>⭐</span>
          </button>
        ))}
      </div>
      <textarea name="comment" className="input" rows={2} placeholder="Ceritakan pengalamanmu (opsional)" />
      {state?.error && <p className="text-xs font-semibold text-merah">{state.error}</p>}
      <button className="btn-utama w-full !py-2" disabled={pending || rating === 0}>
        {pending ? "Mengirim…" : "Kirim penilaian"}
      </button>
    </form>
  );
}
