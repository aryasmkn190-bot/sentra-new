import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveHub, cartItemCount } from "@/lib/storefront";
import { IconHome, IconCategory, IconCart, IconOrders, IconUser } from "@/components/MenuIcons";
import { NotificationBell } from "@/components/NotificationBell";
import { db } from "@/lib/db";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [hub, count, session] = await Promise.all([getActiveHub(), cartItemCount(), getSession("user")]);

  // Hitung jumlah pengumuman aktif yang belum dibaca user
  let hasUnread = false;
  if (session) {
    const unreadCount = await db.announcement.count({
      where: {
        is_active: true,
        reads: {
          none: { user_id: session.sub },
        },
      },
    });
    hasUnread = unreadCount > 0;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-latar">
      {/* hero-header — red palette from logo #A00000, compact for wider feel */}
      <header className="sticky top-0 z-20 bg-brand text-white">
        {/* wavy-svg-divider (sine wave, bottom 20px, fill latar) */}
        <svg
          viewBox="0 0 600 20"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-5 w-full fill-latar"
        >
          <path d="M 0 10 C 72 18, 128 18, 200 10 C 272 2, 328 2, 400 10 C 472 18, 528 18, 600 10 L 600 20 L 0 20 Z" />
        </svg>

        {/* header-inner (row, compact padding, space-between, center) */}
        <div className="relative z-10 flex items-center justify-between px-4 pb-7 pt-4">
          {/* logo-title-block (wireframe: row, gap 8, center) */}
          <Link href="/" className="flex items-center gap-2">
            {/* logo-icon (wireframe: 40x40, white bg, radius 8) */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1.5">
              <img src="/logo.png" alt="Sentra Logo" className="h-full w-full object-contain" />
            </div>
            {/* title-block (wireframe: column, heading + caption) */}
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight">Sentra</span>
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                {hub ? hub.name : "hub terdekat"}
              </span>
            </div>
          </Link>

          <NotificationBell hasUnread={hasUnread} loggedIn={!!session} />
        </div>
      </header>

      {/* scroll-content (wireframe: scroll-view, padding bottom 96) */}
      <main className="flex-1 pb-28">{children}</main>

      {/* === Bottom Nav: wireframe tab-bar style === */}
      {/* rounded-t-3xl, shadow-elevation-3 (wireframe: elevation=3) */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 rounded-t-3xl border-t border-black/5 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="relative grid h-20 grid-cols-5 items-center text-center text-[11px] font-semibold text-tinta/60">
          {/* Home */}
          <Link href="/" className="relative flex flex-col items-center gap-0.5 pt-2 hover:text-hijau">
            <span className="text-hijau-tua" aria-hidden><IconHome /></span>
            <span>Beranda</span>
          </Link>

          {/* Kategori */}
          <Link href="/kategori" className="relative flex flex-col items-center gap-0.5 pt-2 hover:text-hijau">
            <span className="text-hijau-tua" aria-hidden><IconCategory /></span>
            <span>Kategori</span>
          </Link>

          {/* Cart FAB - wireframe: floating, offsetY=-24, rounded-full, elevation=4 */}
          <Link href="/keranjang" className="relative flex flex-col items-center pt-2">
            <div className="relative -translate-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A00000] text-white shadow-lg shadow-[#A00000]/30 transition-transform hover:scale-105 active:scale-95">
                <span aria-hidden><IconCart size={24} /></span>
              </div>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-merah px-1 text-[10px] font-extrabold text-white shadow-sm">
                  {count}
                </span>
              )}
            </div>
            <span className="-mt-3">Keranjang</span>
          </Link>

          {/* Pesanan */}
          <Link href="/pesanan" className="relative flex flex-col items-center gap-0.5 pt-2 hover:text-hijau">
            <span className="text-hijau-tua" aria-hidden><IconOrders /></span>
            <span>Pesanan</span>
          </Link>

          {/* Akun */}
          <Link href={session ? "/akun" : "/masuk"} className="relative flex flex-col items-center gap-0.5 pt-2 hover:text-hijau">
            <span className="text-hijau-tua" aria-hidden><IconUser /></span>
            <span>Akun</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}