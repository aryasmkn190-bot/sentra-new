import Link from "next/link";
import { db } from "@/lib/db";
import { loadProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { CategoryImage } from "@/components/CategoryImage";
import { rupiah } from "@/lib/money";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [banners, categories, promoCards, freshCards, topPickCards, session] = await Promise.all([
    db.banner.findMany({
      where: { is_active: true, placement: "home_top", start_at: { lte: now }, end_at: { gte: now } },
      orderBy: { sort_order: "asc" },
    }),
    db.category.findMany({ where: { is_active: true, parent_id: null }, orderBy: { sort_order: "asc" } }),
    loadProductCards({ compare_at_price: { not: null } }, 4),
    loadProductCards({ category: { slug: { in: ["sayur-segar", "buah"] } } }, 4),
    loadProductCards({}, 4),
    getSession("user"),
  ]);

  const user = session ? await db.user.findUnique({ where: { id: session.sub }, select: { name: true } }) : null;

  const jam = new Date().getHours();
  let greeting = "Selamat malam";
  if (jam >= 5 && jam < 12) greeting = "Selamat pagi";
  else if (jam >= 12 && jam < 15) greeting = "Selamat siang";
  else if (jam >= 15 && jam < 18) greeting = "Selamat sore";

  const activeVoucher = await db.voucher.findFirst({
    where: { is_active: true, start_at: { lte: now }, end_at: { gte: now } },
    orderBy: { start_at: "desc" },
  });

  return (
    <div className="space-y-5 px-5 pt-4">
      {/* === GREETING + SEARCH SECTION (wireframe: greeting-search-section) === */}
      {/* wireframe: section, padding top 8, left 20, right 20 */}
      {/* greeting-line (muted) + welcome-line (heading) + search-bar (margin-top 16, radius 16, elevation 1) */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-tinta/50">{greeting},</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-tinta">{user?.name || "Selamat Datang"}!</h1>
        </div>
        {/* search-bar (wireframe: radius 16, elevation 1) */}
        <form action="/cari" className="relative">
          <input
            name="q"
            placeholder="Cari sayur, susu, snack, obat…"
            className="w-full rounded-2xl border border-black/5 bg-white px-4 py-3 pl-11 text-sm shadow-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau/20"
            aria-label="Cari produk"
          />
          <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-tinta/40">🔍</span>
        </form>
        {/* ETA info */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-tinta/60">
          <span className="inline-flex items-center gap-1 rounded-full bg-kilat px-2 py-0.5 font-extrabold text-tinta">
            ⚡ 15-30 mnt
          </span>
          <span>buka 24 jam</span>
        </div>
      </section>

      {/* === PROMO BANNER (wireframe: promo-banner) === */}
      {/* warm bg #Fdf3e7, radius=24, elevation=1 */}
      {banners.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-none">
          {banners.map((b, idx) => (
            <Link
              key={b.id}
              href={b.target_url}
              className="relative min-w-[88%] snap-center overflow-hidden rounded-3xl bg-[#Fdf3e7] shadow-sm"
              style={{ aspectRatio: b.image_url ? "16/9" : "16/9" }}
            >
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col justify-center p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-hijau">Promo</p>
                  <p className="mt-1 text-lg font-extrabold leading-snug text-tinta">{b.title}</p>
                  <span className="mt-3 inline-flex w-fit rounded-xl bg-hijau px-4 py-2 text-xs font-bold text-white shadow-md">
                    Pesan Sekarang
                  </span>
                </div>
              )}
              {/* pagination dots (wireframe: promo-pagination-dots) */}
              {idx === 0 && banners.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {banners.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === 0 ? "w-4 bg-hijau" : "w-1.5 bg-hijau/25"
                      }`}
                    />
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* === CATEGORY FILTERS (wireframe: category-filters) === */}
      {/* horizontal-scroll, icon 48px in rounded-16 card, active state highlighted */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-tinta">Kategori</h2>
          <Link href="/kategori" className="text-xs font-bold text-hijau hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {categories.slice(0, 8).map((c, idx) => (
            <Link
              key={c.id}
              href={`/kategori/${c.slug}`}
              className="flex min-w-[64px] flex-col items-center gap-2"
            >
              {/* wireframe: icon-button size=48, radius=16, active=elevation-2 */}
              <div
                className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl transition-all ${
                  idx === 0
                    ? "bg-hijau-muda shadow-md ring-2 ring-hijau"
                    : "bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-hijau/30"
                }`}
              >
                <CategoryImage slug={c.slug} image_url={c.image_url} alt={c.name} />
              </div>
              {/* wireframe: active-label vs muted-label */}
              <span className={`text-[10px] font-bold ${idx === 0 ? "text-hijau-tua" : "text-tinta/60"}`}>
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* === DISCOUNT BANNER (wireframe: discount-banner) === */}
      {/* bg=#FFF4E5, radius=16, elevation=1 */}
      {activeVoucher && (
        <Link
          href="/kategori"
          className="flex items-center justify-between rounded-2xl bg-[#FFF4E5] p-4 shadow-sm transition-colors hover:bg-kilat/20"
        >
          <div className="flex items-center gap-3">
            {/* wireframe: discount-icon-box radius=9999 */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kilat">
              <svg className="h-5 w-5 text-tinta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-tinta">Promo Spesial</p>
              <p className="text-[11px] font-semibold text-tinta/60">
                Kode: {activeVoucher.code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-extrabold text-hijau-tua">
                {activeVoucher.type === "fixed"
                  ? rupiah(activeVoucher.value)
                  : activeVoucher.type === "percentage"
                  ? `${activeVoucher.value}%`
                  : "Gratis Ongkir"}
              </p>
              <p className="text-[10px] text-tinta/50">
                Min. belanja {rupiah(activeVoucher.min_order_amount)}
              </p>
            </div>
            {/* wireframe: discount-chevron icon=chevron-right size=16 */}
            <svg className="h-4 w-4 text-tinta/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      )}

      {/* === RECOMMENDATIONS (wireframe: recommendations-section) === */}
      {/* section-title + link "See all" */}
      {topPickCards.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-base font-extrabold text-tinta">Rekomendasi</h2>
            <Link href="/kategori" className="text-xs font-bold text-hijau hover:underline">
              Lihat semua
            </Link>
          </div>
          {/* wireframe: rec-product-grid columns=2 gap=16 */}
          <div className="grid grid-cols-2 gap-4">
            {topPickCards.map((p, idx) => (
              <ProductCard key={p.id} p={p} badge={idx === 0 ? "BEST SELLER" : undefined} />
            ))}
          </div>
        </section>
      )}

      {/* === LAGI DISKON === */}
      {promoCards.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-base font-extrabold text-tinta">Lagi Diskon</h2>
            <Link href="/kategori" className="text-xs font-bold text-hijau hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {promoCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* === SEGAR HARI INI === */}
      {freshCards.length > 0 && (
        <section>
          <div className="mb-1">
            <h2 className="text-base font-extrabold text-tinta">Segar Hari Ini</h2>
            <p className="text-[11px] text-tinta/50">
              Jaminan segar: tidak layak kami ganti atau refund.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {freshCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}