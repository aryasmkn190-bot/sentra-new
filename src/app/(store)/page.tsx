import Link from "next/link";
import { db } from "@/lib/db";
import { loadProductCards } from "@/lib/catalog";
import { HomeCatalog } from "@/components/HomeCatalog";
import { rupiah } from "@/lib/money";
import { getSession } from "@/lib/session";
import { cartItemCount } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [banners, categories, topPickCards, promoCards, session, cartCount] = await Promise.all([
    db.banner.findMany({
      where: { is_active: true, placement: "home_top", start_at: { lte: now }, end_at: { gte: now } },
      orderBy: { sort_order: "asc" },
    }),
    db.category.findMany({ where: { is_active: true, parent_id: null }, orderBy: { sort_order: "asc" } }),
    // Home: ambil pool ranking (24), UI tampil ringkas dulu + muat lebih banyak
    loadProductCards({}, { take: 24, bestOffers: true }),
    loadProductCards({ compare_at_price: { not: null } }, 8),
    getSession("user"),
    cartItemCount(),
  ]);

  const user = session
    ? await db.user.findUnique({ where: { id: session.sub }, select: { name: true } })
    : null;

  const jam = new Date().getHours();
  let greeting = "Selamat malam";
  if (jam >= 5 && jam < 12) greeting = "Selamat pagi";
  else if (jam >= 12 && jam < 15) greeting = "Selamat siang";
  else if (jam >= 15 && jam < 18) greeting = "Selamat sore";

  const activeVoucher = await db.voucher.findFirst({
    where: { is_active: true, start_at: { lte: now }, end_at: { gte: now } },
    orderBy: { start_at: "desc" },
  });

  const openOrders = session
    ? await db.order.count({
        where: {
          user_id: session.sub,
          status: { in: ["pending_payment", "confirmed", "picking", "packed", "on_delivery", "arrived"] },
        },
      })
    : 0;

  const displayName = user?.name?.split(" ")[0] || "Sobat Sentra";
  const hero = banners[0] ?? null;

  const categoryProps = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image_url: c.image_url ?? null,
  }));

  return (
    <div className="pb-2">
      <section className="relative w-full overflow-hidden bg-[#1A0505]">
        <Link
          href={hero?.target_url || "/kategori"}
          className="relative block h-[250px] w-full sm:h-[280px]"
          aria-label={hero?.title || "Promo Sentra"}
        >
          {hero?.image_url ? (
            <img
              src={hero.image_url}
              alt={hero.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#3D0C0C] via-[#A00000] to-[#1A0505]" />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

          {!hero?.image_url && (
            <div className="absolute inset-x-0 bottom-0 px-5 pb-12 pt-16">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFD54A]">Promo</p>
              <p className="mt-1 max-w-[85%] text-lg font-extrabold leading-snug text-white drop-shadow">
                {hero?.title || "Belanja harian antar cepat"}
              </p>
              <span className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#A00000] shadow-md">
                Cek Sekarang →
              </span>
            </div>
          )}

          {banners.length > 1 && (
            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </Link>
      </section>

      <div className="relative z-10 -mt-6 overflow-hidden rounded-t-[1.5rem] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="space-y-4 bg-[#A00000] px-4 pt-4">
          <section>
            <p className="text-[12px] font-medium text-white/75">{greeting},</p>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white">{displayName}</h1>

            <form action="/cari" className="relative mt-3">
              <input
                name="q"
                placeholder="Cari sayur, susu, snack, obat…"
                className="w-full rounded-full border border-white/20 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
                aria-label="Cari produk"
              />
              <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
              </span>
            </form>
          </section>

          {/*
            Chip di zona merah = filter.
            Penawaran Terbaik + Lagi Diskon di bawah ringkasan ikut filter kategori.
          */}
          <HomeCatalog
            categories={categoryProps}
            initialProducts={topPickCards}
            initialPromoProducts={promoCards}
          >
            {/* Order Langsung — scan QR di gudang */}
            <Link
              href="/order-langsung"
              className="flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A0505] to-[#A00000] p-4 text-white shadow-md shadow-[#A00000]/25 ring-1 ring-white/10"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl" aria-hidden>
                📷
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#FFD54A]">Anda di HUB PTO Bandung</p>
                <p className="text-base font-extrabold leading-tight">Order Langsung</p>
                <p className="text-[11px] font-medium text-white/75">Scan QR produk → bayar → ambil</p>
              </div>
              <span className="text-xl font-bold text-white/90" aria-hidden>
                →
              </span>
            </Link>

            {/* Ringkasan belanja */}
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Ringkasan belanja
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900">Siap antar 15–30 mnt</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD54A] px-2.5 py-1 text-[10px] font-extrabold text-[#1A0505]">
                  ⚡ 24 jam
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-black/5">
                <Link href="/keranjang" className="px-3 py-3 text-center transition hover:bg-slate-50">
                  <p className="text-lg font-extrabold tabular-nums text-[#A00000]">{cartCount}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Keranjang</p>
                </Link>
                <Link href="/pesanan" className="px-3 py-3 text-center transition hover:bg-slate-50">
                  <p className="text-lg font-extrabold tabular-nums text-slate-900">{openOrders}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Aktif</p>
                </Link>
                <Link href="/kategori" className="px-3 py-3 text-center transition hover:bg-slate-50">
                  <p className="text-lg font-extrabold tabular-nums text-slate-900">{categories.length}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Kategori</p>
                </Link>
              </div>
              <div className="flex items-center justify-between border-t border-black/5 bg-slate-50/80 px-4 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">Drop point · tanpa ongkir</p>
                <Link href="/kategori" className="text-[11px] font-extrabold text-[#A00000]">
                  Belanja sekarang →
                </Link>
              </div>
            </section>

            {banners.length > 1 && (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-none">
                {banners.slice(1).map((b) => (
                  <Link
                    key={b.id}
                    href={b.target_url}
                    className="relative min-w-[88%] snap-center overflow-hidden rounded-2xl bg-[#1A0505] shadow-sm"
                    style={{ aspectRatio: "16/9" }}
                  >
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col justify-center bg-gradient-to-br from-[#3D0C0C] to-[#A00000] p-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFD54A]">Promo</p>
                        <p className="mt-1 text-lg font-extrabold leading-snug text-white">{b.title}</p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {activeVoucher && (
              <Link
                href="/kategori"
                className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#A00000] to-[#C00000] p-4 text-white shadow-md shadow-[#A00000]/20"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white/80">Voucher spesial untukmu</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold">
                    {activeVoucher.type === "fixed"
                      ? `Diskon ${rupiah(activeVoucher.value)}`
                      : activeVoucher.type === "percentage"
                        ? `Diskon hingga ${activeVoucher.value}%`
                        : "Gratis ongkir"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/70">
                    Kode <span className="font-bold text-[#FFD54A]">{activeVoucher.code}</span>
                    {" · "}min. {rupiah(activeVoucher.min_order_amount)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-[#A00000]">
                  Pakai →
                </span>
              </Link>
            )}

            <section>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { href: "/kategori", label: "Kategori", emoji: "🗂️" },
                  { href: "/cari", label: "Cari", emoji: "🔍" },
                  { href: "/pesanan", label: "Pesanan", emoji: "📦" },
                  { href: session ? "/akun/profil" : "/masuk", label: "Profil", emoji: "👤" },
                  { href: "/keranjang", label: "Keranjang", emoji: "🛒" },
                ].map((a) => (
                  <Link
                    key={a.href + a.label}
                    href={a.href}
                    className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-1 py-3 shadow-sm ring-1 ring-black/5 transition active:scale-95"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDF0F0] text-xl">
                      {a.emoji}
                    </span>
                    <span className="text-center text-[10px] font-bold leading-tight text-slate-700">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </HomeCatalog>
        </div>
      </div>
    </div>
  );
}
