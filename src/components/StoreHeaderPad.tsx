"use client";

import { usePathname } from "next/navigation";

/** Compensates layout main -mt on non-home so content sits below solid header */
export function NonHomePadClient() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <div className="h-[4.25rem] shrink-0" aria-hidden />;
}
