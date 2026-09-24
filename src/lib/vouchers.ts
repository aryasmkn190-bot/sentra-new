/**
 * Ketentuan voucher (restriksi): produk/kategori/hari/jam + kalkulasi diskon.
 * Dipakai bersama oleh: actions/vouchers.ts (klaim & checkout), actions/checkout.ts (placeOrder),
 * dan admin (preview ketentuan).
 */

export type VoucherLike = {
  type: string;
  value: number;
  max_discount: number | null;
  product_ids?: string[];
  category_ids?: string[];
  bundle_only?: boolean;
  bundle_ids?: string[];
  days_of_week?: number[];
  start_minute?: number | null;
  end_minute?: number | null;
};

export type VoucherCartCtx = {
  /** id produk di keranjang saat ini */
  cartProductIds: string[];
  /** id kategori produk di keranjang saat ini */
  cartCategoryIds: string[];
  /** id paket bundling di keranjang saat ini */
  cartBundleIds?: string[];
  /** subtotal paket bundling */
  cartBundleSubtotal?: number;
  now?: Date;
};

/** Nama hari (index = JS Date.getDay(): 0=Minggu). */
export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function intersects(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

/**
 * Cek ketentuan voucher terhadap konteks keranjang + waktu sekarang.
 * Return pesan error (string) jika TIDAK memenuhi, null jika boleh dipakai.
 */
export function voucherRestrictionError(v: VoucherLike, ctx: VoucherCartCtx): string | null {
  const now = ctx.now ?? new Date();

  // Produk tertentu
  if (v.product_ids && v.product_ids.length > 0) {
    if (!intersects(v.product_ids, ctx.cartProductIds)) {
      return "Voucher ini hanya berlaku untuk produk tertentu.";
    }
  }

  // Kategori tertentu
  if (v.category_ids && v.category_ids.length > 0) {
    if (!intersects(v.category_ids, ctx.cartCategoryIds)) {
      return "Voucher ini hanya berlaku untuk kategori tertentu.";
    }
  }

  // Khusus Paket / Bundling
  if (v.bundle_only) {
    if (!ctx.cartBundleIds || ctx.cartBundleIds.length === 0) {
      return "Voucher ini hanya berlaku untuk pembelian produk Paket / Bundling.";
    }
  }

  // Paket tertentu
  if (v.bundle_ids && v.bundle_ids.length > 0) {
    if (!ctx.cartBundleIds || !intersects(v.bundle_ids, ctx.cartBundleIds)) {
      return "Voucher ini hanya berlaku untuk paket bundling tertentu.";
    }
  }

  // Hari tertentu
  if (v.days_of_week && v.days_of_week.length > 0) {
    const day = now.getDay();
    if (!v.days_of_week.includes(day)) {
      const days = v.days_of_week.map((d) => DAY_NAMES[d] ?? `Hari ${d}`);
      return `Voucher ini hanya berlaku di hari ${days.join(", ")}.`;
    }
  }

  // Jam tertentu
  if (v.start_minute != null && v.end_minute != null) {
    const m = minutesOfDay(now);
    let ok: boolean;
    if (v.start_minute <= v.end_minute) {
      ok = m >= v.start_minute && m < v.end_minute;
    } else {
      // lintas tengah malam (mis. 22:00 - 06:00)
      ok = m >= v.start_minute || m < v.end_minute;
    }
    if (!ok) {
      return `Voucher ini hanya berlaku jam ${minuteToHHMM(v.start_minute)} - ${minuteToHHMM(v.end_minute)}.`;
    }
  }

  return null;
}

/** Hitung nominal diskon dari subtotal (free_delivery → 0, diproses terpisah). */
export function voucherDiscount(v: VoucherLike, subtotal: number, baseAmount?: number): number {
  const target = baseAmount != null && baseAmount > 0 ? baseAmount : subtotal;
  if (v.type === "fixed") return Math.min(v.value, subtotal);
  if (v.type === "percentage") {
    let d = Math.floor((target * v.value) / 100);
    if (v.max_discount) d = Math.min(d, v.max_discount);
    return Math.min(d, subtotal);
  }
  return 0;
}

export function minuteToHHMM(minute: number) {
  const h = Math.floor(minute / 60).toString().padStart(2, "0");
  const m = (minute % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** "HH:MM" → menit sejak 00:00; null bila tidak valid. */
export function hhmmToMinute(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v || "").trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** Ringkasan ketentuan utk tampilan UI ("Hari Kamis–Jumat · 09:00–17:00 · Produk tertentu"). */
export function formatRestriction(v: VoucherLike): string | null {
  const parts: string[] = [];
  if (v.days_of_week && v.days_of_week.length > 0) {
    const days = [...v.days_of_week].sort((a, b) => a - b);
    parts.push(`Hari ${days.map((d) => DAY_NAMES[d] ?? `Hari ${d}`).join(", ")}`);
  }
  if (v.start_minute != null && v.end_minute != null) {
    parts.push(`Jam ${minuteToHHMM(v.start_minute)}–${minuteToHHMM(v.end_minute)}`);
  }
  if (v.product_ids && v.product_ids.length > 0) parts.push("Produk tertentu");
  if (v.category_ids && v.category_ids.length > 0) parts.push("Kategori tertentu");
  if (v.bundle_only) parts.push("Khusus Paket Bundling");
  if (v.bundle_ids && v.bundle_ids.length > 0) parts.push("Paket tertentu");
  return parts.length > 0 ? parts.join(" · ") : null;
}
