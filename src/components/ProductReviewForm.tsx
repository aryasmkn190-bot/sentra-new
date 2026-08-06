"use client";

import { useActionState, useState } from "react";
import { submitProductReview } from "@/actions/reviews";

/** Form ulasan produk — orderId wajib (hanya pesanan selesai yang dibeli). */
export function ProductReviewForm({
  productId,
  orderId,
  productName,
}: {
  productId: string;
  orderId: string;
  productName?: string;
}) {
  const [state, action, pending] = useActionState(submitProductReview, null);
  const [rating, setRating] = useState(0);

  if (state?.ok) {
    return (
      <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
        Terima kasih atas ulasanmu! Rating akan tampil di halaman produk. 💚
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-sm font-extrabold">
        {productName ? `Nilai ${productName}` : "Beri rating produk"}
      </p>
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} bintang`}>
            <span className={n <= rating ? "" : "grayscale opacity-40"}>⭐</span>
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        className="input"
        rows={2}
        placeholder="Ceritakan kualitas produk (opsional)"
        maxLength={1000}
      />
      {state?.error && <p className="text-xs font-semibold text-merah">{state.error}</p>}
      <button className="btn-utama w-full !py-2" disabled={pending || rating === 0}>
        {pending ? "Mengirim…" : "Kirim ulasan"}
      </button>
    </form>
  );
}
