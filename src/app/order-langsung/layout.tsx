import Link from "next/link";

/**
 * Layout minimal untuk Order Langsung — tanpa bottom nav store agar kamera full.
 * Pakai shell sederhana + back ke home.
 */
export default function OrderLangsungLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#F2F3F5]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3">
        <Link href="/" className="text-sm font-bold text-[#A00000]" aria-label="Beranda">
          ←
        </Link>
        <span className="text-sm font-extrabold text-slate-800">Order Langsung</span>
      </header>
      {children}
    </div>
  );
}
