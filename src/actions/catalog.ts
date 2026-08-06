"use server";

import { db } from "@/lib/db";
import { getActiveCart, getActiveHub } from "@/lib/storefront";
import type { ProductCardData } from "@/components/ProductCard";
import { bestOfferScore } from "@/lib/product-stats";
import { loadProductCards } from "@/lib/catalog";

type LoadOptions = {
  onlyPromo?: boolean;
  bestOffers?: boolean;
  take?: number;
};

/** Ambil produk aktif berdasarkan kategori slug. */
export async function getProductsByCategory(
  categorySlug: string | null,
  takeOrOptions: number | LoadOptions = 60
): Promise<ProductCardData[]> {
  const opts: LoadOptions =
    typeof takeOrOptions === "number" ? { take: takeOrOptions } : takeOrOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (categorySlug && categorySlug !== "semua") {
    where.category = { slug: categorySlug };
  }
  if (opts.onlyPromo) {
    // promo di parent ATAU salah satu varian
    where.OR = [
      { compare_at_price: { not: null } },
      { variants: { some: { is_active: true, compare_at_price: { not: null } } } },
    ];
  }
  return loadProductCards(where, {
    take: opts.take ?? 60,
    bestOffers: !!opts.bestOffers,
  });
}

/** Ambil produk diskon + penawaran terbaik untuk 1 kategori (home filter). */
export async function getHomeProductsByCategory(
  categorySlug: string | null
): Promise<{ products: ProductCardData[]; promoProducts: ProductCardData[] }> {
  const slug = categorySlug && categorySlug !== "semua" ? categorySlug : null;
  const [products, promoProducts] = await Promise.all([
    getProductsByCategory(slug, { take: 24, bestOffers: true }),
    getProductsByCategory(slug, { onlyPromo: true, take: 8 }),
  ]);
  return { products, promoProducts };
}

// re-export helpers for server components that imported from here historically
export { getActiveHub, getActiveCart, bestOfferScore };
