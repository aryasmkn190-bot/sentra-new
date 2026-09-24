"use client";

import { useState, useTransition, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { CategoryImage } from "@/components/CategoryImage";
import { getHomeProductsByCategory } from "@/actions/catalog";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

interface Props {
  categories: Category[];
  initialProducts: ProductCardData[];
  initialPromoProducts: ProductCardData[];
  /** Konten zona abu sebelum grid produk (ringkasan, banner, dll.) */
  children?: ReactNode;
}

/** Home "Semua": ringkas dulu (3 baris × 2 kolom). */
const BEST_INITIAL_SEMUA = 6;
/** Filter kategori: sedikit lebih longgar (4 baris). */
const BEST_INITIAL_KATEGORI = 8;
/** Tiap klik "Muat lebih banyak". */
const BEST_LOAD_STEP = 6;
/** Maks. diskon di home. */
const PROMO_VISIBLE = 4;

export function HomeCatalog({
  categories,
  initialProducts,
  initialPromoProducts,
  children,
}: Props) {
  const [activeSlug, setActiveSlug] = useState<string>("semua");
  const [products, setProducts] = useState<ProductCardData[]>(initialProducts);
  const [promoProducts, setPromoProducts] = useState<ProductCardData[]>(initialPromoProducts);
  const [visibleBest, setVisibleBest] = useState(BEST_INITIAL_SEMUA);
  const [isPending, startTransition] = useTransition();
  // Target scroll halus saat kategori diklik
  const productsRef = useRef<HTMLElement>(null);

  const initialLimitFor = useCallback((slug: string) => {
    return slug === "semua" ? BEST_INITIAL_SEMUA : BEST_INITIAL_KATEGORI;
  }, []);

  const selectCategory = useCallback(
    (slug: string) => {
      if (slug === activeSlug) return;
      setActiveSlug(slug);
      setVisibleBest(initialLimitFor(slug));
      // Scroll halus ke grid produk (setelah state kategori di-commit)
      requestAnimationFrame(() => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      startTransition(async () => {
        const result = await getHomeProductsByCategory(slug === "semua" ? null : slug);
        setProducts(result.products);
        setPromoProducts(result.promoProducts);
      });
    },
    [activeSlug, initialLimitFor]
  );

  const activeName =
    activeSlug === "semua"
      ? null
      : categories.find((c) => c.slug === activeSlug)?.name ?? null;

  const shownProducts = products.slice(0, visibleBest);
  const hasMoreBest = products.length > visibleBest;
  const remainingBest = Math.max(0, products.length - visibleBest);
  const shownPromo = promoProducts.slice(0, PROMO_VISIBLE);

  return (
    <>
      {/* Chip kategori di zona merah — filter saja, tidak pindah halaman */}
      {categories.length > 0 && (
        <section className="pb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => selectCategory("semua")}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-bold transition ${
                activeSlug === "semua"
                  ? "border-white bg-white text-[#A00000] shadow-sm"
                  : "border-white/25 bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/90 text-[14px]">
                🗂️
              </span>
              Semua
            </button>

            {categories.slice(0, 10).map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => selectCategory(c.slug)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-bold transition ${
                  activeSlug === c.slug
                    ? "border-white bg-white text-[#A00000] shadow-sm"
                    : "border-white/25 bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <span className="flex h-6 w-6 overflow-hidden rounded-full bg-white/90">
                  <CategoryImage
                    slug={c.slug}
                    image_url={c.image_url}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                </span>
                {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Zona abu: ringkasan → penawaran → lagi diskon */}
      <div className="-mx-4 space-y-4 bg-[#F2F3F5] px-4 pb-2 pt-4">
        {children}

        {/* Penawaran Terbaik — curated ringkas + muat lebih banyak */}
        <section ref={productsRef} className="scroll-mt-4 pb-5">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {activeName ? activeName : "Penawaran Terbaik"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isPending
                  ? "Memuat…"
                  : activeName
                    ? `Top ${shownProducts.length} · laris & rating terbaik`
                    : "Pilihan ringkas: paling laris & rating tertinggi"}
              </p>
            </div>
            {activeSlug !== "semua" && (
              <Link
                href={`/kategori/${activeSlug}`}
                className="shrink-0 text-xs font-bold text-[#A00000]"
              >
                Semua di kategori
              </Link>
            )}
          </div>

          {isPending ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 text-center ring-1 ring-black/5">
              <span className="text-4xl">🛒</span>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Belum ada produk di kategori ini
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {shownProducts.map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    badge={idx === 0 && activeSlug === "semua" ? "BEST" : undefined}
                  />
                ))}
              </div>

              {hasMoreBest && (
                <button
                  type="button"
                  onClick={() => setVisibleBest((n) => n + BEST_LOAD_STEP)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-white py-3 text-xs font-extrabold text-[#A00000] shadow-sm ring-1 ring-black/5 transition active:scale-[0.99]"
                >
                  Muat lebih banyak
                  <span className="font-semibold text-slate-400">(+{Math.min(BEST_LOAD_STEP, remainingBest)})</span>
                </button>
              )}
            </>
          )}
        </section>

        {/* Lagi Diskon — max 4 di home agar tidak menumpuk */}
        {(isPending || shownPromo.length > 0) && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Lagi Diskon</h2>
                <p className="text-[11px] text-slate-500">
                  {isPending
                    ? "Memuat…"
                    : activeName
                      ? `Diskon di ${activeName}`
                      : "Promo spesial hari ini"}
                </p>
              </div>
              <Link href="/kategori" className="text-xs font-bold text-[#A00000]">
                Lihat semua
              </Link>
            </div>

            {isPending ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {shownPromo.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
