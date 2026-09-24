/**
 * Skor ranking Penawaran Terbaik:
 * - sold_count (bobot utama)
 * - rating_avg * log(1 + rating_count) (rating tinggi + cukup sample)
 * - tie-break: rating_avg, sold_count, created_at
 */
export function bestOfferScore(p: {
  sold_count: number;
  rating_avg: number;
  rating_count: number;
}) {
  const sold = Math.max(0, p.sold_count || 0);
  const avg = Math.max(0, p.rating_avg || 0);
  const count = Math.max(0, p.rating_count || 0);
  const ratingTerm = avg * Math.log1p(count);
  return sold * 10 + ratingTerm * 20;
}

export function formatSoldCount(n: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}rb+`;
  }
  return String(n);
}

export function formatRating(avg: number, count: number): string {
  if (!count || count <= 0) return "Belum ada rating";
  return `${avg.toFixed(1)} · ${count} ulasan`;
}
