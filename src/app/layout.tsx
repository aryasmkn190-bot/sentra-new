import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sentra — Belanja Harian Antar Cepat", template: "%s · Sentra" },
  description:
    "Belanja sayur, buah, daging, susu, snack, obat, hingga galon — sampai dalam hitungan menit, 24 jam.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0E7A4A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
