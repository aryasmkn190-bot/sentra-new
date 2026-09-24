"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AdminHeader, HeaderData } from "./AdminHeader";

type NavItem = { href: string; icon: React.ReactNode; label: string; badge?: number };
type NavSection = { label: string; items: NavItem[] };

type Props = {
  navSections: NavSection[];
  headerData: HeaderData;
  logoutAction: () => void;
  children: React.ReactNode;
};

export function AdminShell({
  navSections,
  headerData,
  logoutAction,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-latar">
      {/* Sidebar Navigation */}
      <Sidebar
        navSections={navSections}
        logoutAction={logoutAction}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          headerData={headerData}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          logoutAction={logoutAction}
        />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
