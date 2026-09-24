import { getSession } from "@/lib/session";
import { adminLogout, getBackofficeHeaderData } from "@/actions/admin";
import { AdminShell } from "./AdminShell";

type NavItem = { href: string; icon: React.ReactNode; label: string; badge?: number };
type NavSection = { label: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    label: "Menu Utama",
    items: [
      {
        href: "/admin",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        ),
        label: "Dashboard",
      },
      {
        href: "/admin/pesanan",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ),
        label: "Pesanan",
      },
      {
        href: "/admin/produk",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        ),
        label: "Produk",
      },
      {
        href: "/admin/bundling",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96L12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
        ),
        label: "Paket Bundling",
      },
      {
        href: "/admin/kategori",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
        label: "Kategori",
      },
      {
        href: "/admin/laporan",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
        label: "Laporan Online",
      },
    ],
  },
  {
    label: "Order Langsung",
    items: [
      {
        href: "/admin/order-langsung",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
        ),
        label: "Pesanan Langsung",
      },
      {
        href: "/admin/order-langsung/produk",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 7h.01M7 12h10M7 17h10" />
          </svg>
        ),
        label: "Produk Langsung",
      },
      {
        href: "/admin/order-langsung/laporan",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
        label: "Laporan Langsung",
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      {
        href: "/admin/batch",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
        label: "Sistem Batch",
      },
      {
        href: "/admin/voucher",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1a2 2 0 0 1 0 4v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1a2 2 0 0 1 0-4V12z" />
            <path d="M12 2v2" />
            <path d="M12 8v2" />
          </svg>
        ),
        label: "Voucher",
      },
      {
        href: "/admin/banner",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        ),
        label: "Banner",
      },
      {
        href: "/admin/pengguna",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        label: "Pengguna",
      },
      {
        href: "/admin/announcement",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
        label: "Pengumuman",
      },
      {
        href: "/admin/chat",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
        label: "Live Chat",
      },
      {
        href: "/admin/ulasan",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
        label: "Ulasan",
      },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession("admin");
  if (!session) return <div className="min-h-dvh bg-latar">{children}</div>; // halaman login

  // Badge: pesanan pending + chat unread
  const { db } = await import("@/lib/db");
  const [pendingOrders, pendingDirect, chatUnreadAgg] = await Promise.all([
    db.order.count({ where: { status: "pending_payment" } }),
    db.directOrder.count({ where: { status: "pending_payment" } }),
    db.chatThread.aggregate({ _sum: { unread_admin: true }, where: { status: "open" } }),
  ]);
  const chatUnread = chatUnreadAgg._sum.unread_admin ?? 0;
  const navWithBadge: NavSection[] = NAV.map((s) => ({
    ...s,
    items: s.items.map((item) => {
      if (item.href === "/admin/pesanan") return { ...item, badge: pendingOrders || undefined };
      if (item.href === "/admin/order-langsung") return { ...item, badge: pendingDirect || undefined };
      if (item.href === "/admin/chat") return { ...item, badge: chatUnread || undefined };
      return item;
    }),
  }));

  async function handleLogout() {
    "use server";
    await adminLogout();
  }

  const headerData = await getBackofficeHeaderData();
  if (!headerData) return <div className="min-h-dvh bg-latar">{children}</div>;

  return (
    <AdminShell
      navSections={navWithBadge}
      headerData={headerData}
      logoutAction={handleLogout}
    >
      {children}
    </AdminShell>
  );
}
