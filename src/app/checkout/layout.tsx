import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveHub } from "@/lib/storefront";
import { NotificationBell } from "@/components/NotificationBell";
import { ChatWidget } from "@/components/ChatWidget";
import { db } from "@/lib/db";

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const [hub, session] = await Promise.all([getActiveHub(), getSession("user")]);

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
      {/* Dark header — match store shell */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#1A0505] via-[#2A0A0A] to-[#3D0C0C] text-white">
        <div className="relative z-10 flex items-center justify-between px-4 pb-3 pt-3.5">
          <div className="flex items-center gap-3">
            <Link href="/keranjang" className="text-white/90 transition hover:text-white" aria-label="Kembali">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1">
                <img src="/logo.png" alt="Sentra" className="h-full w-full object-contain" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-extrabold">Checkout</p>
                <p className="text-[10px] text-white/60">{hub ? hub.name : "Sentra"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ChatWidget loggedIn={!!session} />
            <NotificationBell hasUnread={hasUnread} loggedIn={!!session} />
          </div>
        </div>
        <div className="h-3 rounded-t-[1.25rem] bg-[#F2F3F5]" />
      </header>

      <main className="flex-1 pb-40">{children}</main>
    </div>
  );
}
