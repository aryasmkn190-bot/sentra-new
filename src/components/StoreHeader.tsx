"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { NotificationBell } from "@/components/NotificationBell";

/** Brand red Sentra (logo) — solid header target color */
const BRAND_RED = "160, 0, 0"; // #A00000

/**
 * Sticky header:
 * - Home (`/`): transparan di atas banner; scroll → meredup bertahap ke merah brand
 * - Halaman lain: solid merah brand (bukan hitam)
 */
export function StoreHeader({
  hubName,
  loggedIn,
  hasUnread,
}: {
  hubName: string;
  loggedIn: boolean;
  hasUnread: boolean;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  /** 0 = fully transparent, 1 = fully solid brand red */
  const [progress, setProgress] = useState(isHome ? 0 : 1);

  useEffect(() => {
    if (!isHome) {
      setProgress(1);
      return;
    }

    // Smooth fade over ~120px of scroll (not on/off at 40px)
    const RANGE = 120;
    const onScroll = () => {
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, y / RANGE));
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // Scrim only while mostly transparent (helps logo on bright banner)
  const scrimOpacity = isHome ? Math.max(0, 0.55 * (1 - progress)) : 0;

  return (
    <header
      className="pointer-events-none sticky top-0 z-30"
      style={{
        // Gradual fill to brand red — no sudden black flash
        backgroundColor: `rgba(${BRAND_RED}, ${progress})`,
        // Soft shadow appears as it becomes solid
        boxShadow:
          progress > 0.15
            ? `0 4px 16px rgba(${BRAND_RED}, ${0.18 * progress})`
            : "none",
        // Smooth any residual style changes
        transition: "box-shadow 150ms ease-out",
      }}
    >
      {scrimOpacity > 0.02 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${scrimOpacity}), rgba(0,0,0,${scrimOpacity * 0.35}), transparent)`,
          }}
        />
      )}

      <div className="pointer-events-auto relative z-10 flex items-center justify-between px-4 pb-2.5 pt-3.5 text-white">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 drop-shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
            <img src="/logo.png" alt="Sentra" className="h-full w-full object-contain" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[17px] font-extrabold tracking-tight">Sentra</span>
            <span className="truncate text-[11px] font-medium text-white/90">{hubName}</span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 drop-shadow-sm">
          <ChatWidget loggedIn={loggedIn} />
          <NotificationBell hasUnread={hasUnread} loggedIn={loggedIn} />
        </div>
      </div>
    </header>
  );
}
