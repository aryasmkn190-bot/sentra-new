import { getSession } from "@/lib/session";
import { adminLogout } from "@/actions/admin";
import { Sidebar } from "./Sidebar";

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
        href: "/admin/kategori",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
        label: "Kategori",
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      {
        href: "/admin/inventori",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
        label: "Inventori",
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
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession("admin");
  if (!session) return <div className="min-h-dvh bg-latar">{children}</div>; // halaman login

  // Badge: count pesanan pending_payment untuk notifikasi sidebar
  const { db } = await import("@/lib/db");
  const pendingOrders = await db.order.count({ where: { status: "pending_payment" } });
  const navWithBadge: NavSection[] = NAV.map((s) => ({
    ...s,
    items: s.items.map((item) =>
      item.href === "/admin/pesanan" ? { ...item, badge: pendingOrders || undefined } : item
    ),
  }));

  async function handleLogout() {
    "use server";
    await adminLogout();
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-latar">
      <Sidebar navSections={navWithBadge} logoutAction={handleLogout} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
