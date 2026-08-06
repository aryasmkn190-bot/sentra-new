import Link from "next/link";
import { getSession } from "@/lib/session";
import { NotificationBell } from "@/components/NotificationBell";
import { ChatWidget } from "@/components/ChatWidget";
import { db } from "@/lib/db";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession("user");

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
      {/* Header style checkout: back + logo, NO bottom nav */}
      <header className="sticky top-0 z-20 bg-brand text-white">
        <svg
          viewBox="0 0 600 20"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-5 w-full fill-latar"
        >
          <path d="M 0 10 C 72 18, 128 18, 200 10 C 272 2, 328 2, 400 10 C 472 18, 528 18, 600 10 L 600 20 L 0 20 Z" />
        </svg>

        <div className="relative z-10 flex items-center justify-between px-4 pb-7 pt-12">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white transition-colors hover:text-white/80" aria-label="Kembali ke beranda">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white p-1">
              <img src="/logo.png" alt="Sentra" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-extrabold tracking-tight">Masuk</span>
          </div>

          <div className="flex items-center gap-3">
            <ChatWidget loggedIn={!!session} />
            <NotificationBell hasUnread={hasUnread} loggedIn={!!session} />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
