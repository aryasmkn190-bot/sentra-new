/** Shared chat constants + helpers (client-safe labels) */

export const CHAT_CATEGORIES = [
  { code: "pesanan", label: "Pesanan / status pengiriman" },
  { code: "pembayaran", label: "Pembayaran / refund" },
  { code: "produk", label: "Produk / stok / kualitas" },
  { code: "akun", label: "Akun / profil / login" },
  { code: "lainnya", label: "Lainnya" },
] as const;

export type ChatCategoryCode = (typeof CHAT_CATEGORIES)[number]["code"];

export function categoryLabel(code: string) {
  return CHAT_CATEGORIES.find((c) => c.code === code)?.label ?? (code || "—");
}

export const MAX_CHAT_BODY = 2000;
export const MAX_CHAT_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
