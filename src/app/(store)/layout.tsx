import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveHub, cartItemCount } from "@/lib/storefront";
import { IconHome, IconCategory, IconCart, IconOrders, IconUser, IconLogin } from "@/components/MenuIcons";
import { StoreHeader } from "@/components/StoreHeader";
import { NonHomePadClient } from "@/components/StoreHeaderPad";
import { db } from "@/lib/db";

/**
 * Store shell — MyTelkomsel style:
 * - header TRANSPARAN di home (banner promo full di belakang)
 * - header solid di halaman lain / setelah scroll
 * - bottom nav 5 item, center cart elevated
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [hub, count, session] = await Promise.all([getActiveHub(), cartItemCount(), getSession("user")]);

  let hasUnread = false;
  if (session) {
    const unreadCount = await db.announcement.count({
      where: {
        is_active: true,
        reads: { none: { user_id: session.sub } },
      },
    });
    hasUnread = unreadCount > 0;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[#F2F3F5]">
      <StoreHeader
        hubName={hub ? hub.name : "hub terdekat"}
        loggedIn={!!session}
        hasUnread={hasUnread}
      />

      {/*
        Always pull main under sticky header (~4.25rem).
        Home: banner fills that space (full-bleed under transparent header).
        Other pages: NonHomePadClient restores top spacing under solid header.
      */}
      <main className="relative z-0 -mt-[4.25rem] flex-1 pb-28">
        <NonHomePadClient />
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="grid h-[4.25rem] grid-cols-5 items-end text-center text-[10px] font-semibold text-slate-500">
          <Link href="/" className="group flex flex-col items-center gap-0.5 pb-2.5 pt-2">
            <span className="text-[#A00000]" aria-hidden>
              <IconHome />
            </span>
            <span className="group-hover:text-[#A00000]">Beranda</span>
          </Link>

          <Link href="/kategori" className="group flex flex-col items-center gap-0.5 pb-2.5 pt-2">
            <span className="text-slate-600 group-hover:text-[#A00000]" aria-hidden>
              <IconCategory />
            </span>
            <span className="group-hover:text-[#A00000]">Kategori</span>
          </Link>

          <Link href="/keranjang" className="relative flex flex-col items-center pb-2 pt-0">
            <div className="relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#A00000] text-white shadow-lg shadow-[#A00000]/35 ring-4 ring-white transition active:scale-95">
              <span aria-hidden>
                <IconCart size={22} />
              </span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FFD54A] px-1 text-[10px] font-extrabold text-[#1A0505] shadow-sm">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </div>
            <span className="mt-0.5 text-[#A00000]">Keranjang</span>
          </Link>

          <Link href="/pesanan" className="group flex flex-col items-center gap-0.5 pb-2.5 pt-2">
            <span className="text-slate-600 group-hover:text-[#A00000]" aria-hidden>
              <IconOrders />
            </span>
            <span className="group-hover:text-[#A00000]">Pesanan</span>
          </Link>

          {session ? (
            <Link href="/akun" className="group flex flex-col items-center gap-0.5 pb-2.5 pt-2">
              <span className="text-slate-600 group-hover:text-[#A00000]" aria-hidden>
                <IconUser />
              </span>
              <span className="group-hover:text-[#A00000]">Akun</span>
            </Link>
          ) : (
            <Link href="/masuk" className="group flex flex-col items-center gap-0.5 pb-2.5 pt-2">
              <span className="text-slate-600 group-hover:text-[#A00000]" aria-hidden>
                <IconLogin />
              </span>
              <span className="group-hover:text-[#A00000]">Masuk</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
