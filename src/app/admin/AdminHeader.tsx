"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { rupiah } from "@/lib/money";
import { AdminChatPopup } from "./chat/AdminChatPopup";
import { AdminProfileModal } from "./AdminProfileModal";

export type HeaderData = {
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  batch: {
    id: string;
    name: string;
    isOpen: boolean;
    scheduleText: string;
  };
  notifications: {
    total: number;
    pendingOrdersCount: number;
    recentPendingOrders: Array<{
      id: string;
      order_number: string;
      total_amount: number;
      created_at: string;
      customer_name: string;
      batch_name: string;
    }>;
    pendingDirectCount: number;
    recentDirectOrders: Array<{
      id: string;
      order_number: string;
      total_amount: number;
      created_at: string;
      customer_name: string;
    }>;
    unreadChatCount: number;
    recentChatThreads: Array<{
      id: string;
      user_name: string;
      last_preview: string;
      unread: number;
      last_time: string;
    }>;
  };
};

type Props = {
  headerData: HeaderData;
  onToggleSidebar?: () => void;
  logoutAction: () => void;
};

export function AdminHeader({ headerData, onToggleSidebar, logoutAction }: Props) {
  const [data, setData] = useState<HeaderData>(headerData);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(headerData.notifications.total);

  // Play audio chime using Web Audio API
  const playChime = () => {
    try {
      if (!soundEnabled) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Poll for live header notifications every 12 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const { getBackofficeHeaderData } = await import("@/actions/admin");
        const fresh = await getBackofficeHeaderData();
        if (fresh) {
          if (fresh.notifications.total > prevCountRef.current) {
            playChime();
          }
          prevCountRef.current = fresh.notifications.total;
          setData(fresh);
        }
      } catch {
        // silent poll error
      }
    }, 12000);

    return () => clearInterval(timer);
  }, [soundEnabled]);

  const { admin, batch, notifications } = data;
  const initials = (admin.name || "A")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-black/5 bg-white px-4 sm:px-6 shadow-sm">
        {/* Sisi Kiri: Hamburger Mobile & Status Batch */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 md:hidden"
              aria-label="Toggle Sidebar"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo Brand (Mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <img src="/logo.png" alt="Sentra" className="h-6 w-6 rounded object-contain" />
            <span className="text-sm font-extrabold text-slate-900">Sentra</span>
          </div>

          {/* Batch Status Pill */}
          <Link
            href="/admin/batch"
            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 border border-black/5 hover:bg-slate-100 transition"
            title={`Atur jadwal: ${batch.scheduleText}`}
          >
            <span className="flex h-2 w-2 relative">
              {batch.isOpen && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  batch.isOpen ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              {batch.name}{" "}
              <span
                className={`text-[10px] font-bold ${
                  batch.isOpen ? "text-emerald-700" : "text-merah"
                }`}
              >
                ({batch.isOpen ? "Dibuka" : "Ditutup"})
              </span>
            </span>
          </Link>
        </div>

        {/* Sisi Kanan: Notifikasi, Live Chat Popup, & Profil Admin */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Live Chat Popup */}
          <button
            type="button"
            onClick={() => setChatPopupOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-black/5 text-slate-700 transition"
            title="Buka Live Chat Admin (Pop-up)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {notifications.unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                {notifications.unreadChatCount}
              </span>
            )}
          </button>

          {/* Notifikasi Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-black/5 text-slate-700 transition"
              title="Notifikasi Pesanan & Chat"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications.total > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white animate-pulse">
                  {notifications.total}
                </span>
              )}
            </button>

            {/* Notification Menu Panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-black/10 p-4 animate-slide-up z-40 space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-slate-900">Pusat Notifikasi</span>
                    {notifications.total > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        {notifications.total} baru
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    title={soundEnabled ? "Nonaktifkan suara lonceng" : "Aktifkan suara lonceng"}
                  >
                    <span>{soundEnabled ? "🔔 Suara ON" : "🔕 Suara OFF"}</span>
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-3 divide-y divide-black/5">
                  {/* Bagian 1: Pesanan Online Baru */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pesanan Online Masuk ({notifications.pendingOrdersCount})
                      </span>
                      <Link
                        href="/admin/pesanan?status=pending_payment"
                        onClick={() => setNotifOpen(false)}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Lihat Semua →
                      </Link>
                    </div>

                    {notifications.recentPendingOrders.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-1">Tidak ada pesanan online baru.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {notifications.recentPendingOrders.map((o) => (
                          <Link
                            key={o.id}
                            href="/admin/pesanan"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-emerald-50/60 transition"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-800 truncate">
                                {o.order_number} · {o.customer_name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {o.batch_name} · {new Date(o.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <span className="text-xs font-extrabold text-emerald-600 shrink-0">
                              {rupiah(o.total_amount)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bagian 2: Pesanan Order Langsung */}
                  {notifications.pendingDirectCount > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Order Langsung QR Gudang ({notifications.pendingDirectCount})
                        </span>
                        <Link
                          href="/admin/order-langsung"
                          onClick={() => setNotifOpen(false)}
                          className="text-[10px] font-bold text-emerald-600 hover:underline"
                        >
                          Buka Kasir →
                        </Link>
                      </div>
                      <div className="space-y-1.5">
                        {notifications.recentDirectOrders.map((d) => (
                          <Link
                            key={d.id}
                            href="/admin/order-langsung"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-blue-50/60 transition"
                          >
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">{d.order_number}</p>
                              <p className="text-[10px] text-slate-500">{d.customer_name}</p>
                            </div>
                            <span className="text-xs font-extrabold text-slate-900">
                              {rupiah(d.total_amount)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bagian 3: Chat Masuk */}
                  {notifications.unreadChatCount > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Pesan Chat Baru ({notifications.unreadChatCount})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            setChatPopupOpen(true);
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline"
                        >
                          Buka Pop-up Chat →
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {notifications.recentChatThreads.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setNotifOpen(false);
                              setChatPopupOpen(true);
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-emerald-50/60 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-slate-800">{t.user_name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{t.last_preview}</p>
                            </div>
                            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white shrink-0">
                              {t.unread}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl p-1 sm:px-2 hover:bg-slate-100 transition"
              aria-label="Menu Profil Admin"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-extrabold text-white text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-extrabold text-slate-800 leading-tight truncate max-w-[120px]">
                  {admin.name || "Admin"}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 leading-tight">
                  {admin.role}
                </p>
              </div>
            </button>

            {/* Profile Dropdown Panel */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-black/10 p-3 animate-slide-up z-40 space-y-2">
                <div className="border-b border-black/5 pb-2 px-2">
                  <p className="text-xs font-extrabold text-slate-900">{admin.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{admin.email}</p>
                  <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                    {admin.role}
                  </span>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>⚙️</span> Kelola Profil & Keamanan
                  </button>

                  <Link
                    href="/admin/batch"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>📦</span> Pengaturan Batch ({batch.name})
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setChatPopupOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>💬</span> Buka Live Chat Pop-up
                  </button>
                </div>

                <div className="border-t border-black/5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logoutAction();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-merah hover:bg-red-50 transition"
                  >
                    <span>🚪</span> Keluar / Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Pop-up Live Chat Pelanggan */}
      <AdminChatPopup open={chatPopupOpen} onClose={() => setChatPopupOpen(false)} />

      {/* Modal Edit Profil Admin */}
      <AdminProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        admin={admin}
      />
    </>
  );
}
