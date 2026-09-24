"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; icon: React.ReactNode; label: string; badge?: number };
type NavSection = { label: string; items: NavItem[] };

export function Sidebar({
  navSections,
  logoutAction,
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
}: {
  navSections: NavSection[];
  logoutAction: () => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setInternalIsOpen;
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Topbar hanya jika tidak dikontrol oleh AdminShell */}
      {controlledIsOpen === undefined && (
        <header className="flex h-14 items-center justify-between border-b border-black/5 bg-slate-900 px-4 text-white md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sentra Logo" className="h-6 w-6 rounded object-contain bg-white/20 p-0.5" />
            <p className="text-sm font-extrabold text-white">Sentra <span className="text-[10px] font-semibold text-emerald-400">Backoffice</span></p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-1.5 hover:bg-white/10 focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </header>
      )}

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed bottom-0 top-0 left-0 z-40 flex w-56 shrink-0 flex-col bg-slate-900 p-4 text-slate-300 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sentra Logo" className="h-6 w-6 rounded object-contain bg-white/20 p-0.5" />
            <p className="text-base font-extrabold text-white">
              Sentra <span className="text-xs font-semibold text-emerald-400">Backoffice</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Nav Links - Grouped by Section */}
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : "hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className={isActive ? "text-white" : "text-slate-400"} aria-hidden>
                        {item.icon}
                      </span>
                      {item.label}
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={() => {
            setIsOpen(false);
            logoutAction();
          }}
          className="w-full rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
        >
          Keluar
        </button>
      </aside>
    </>
  );
}