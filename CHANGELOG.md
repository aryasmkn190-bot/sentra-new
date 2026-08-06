# Changelog — Sentra Storefront

**Proyek:** Sentra (sebelumnya KilatMart)  
**Repo:** `aryasmkn190-bot/sentra-new`  
**Produksi:** https://web.locusgroup.site  
**Stack:** Next.js 15 · TypeScript · Tailwind · Prisma · PostgreSQL  
**Tanggal rilis ringkas:** 2026-07-21

---

## Ringkasan

Platform e-grocery / quick commerce mobile-first: storefront pelanggan, backoffice admin, app mitra picker & driver. Mulai dari MVP PRD KilatMart, di-rebrand dan dioperasikan sebagai **Sentra** di domain Locus Group, dengan model bisnis **drop point** (bukan antar alamat penuh).

---

## v1.0.0 — Fondasi MVP (baseline)

> Basis implementasi PRD KilatMart v1.0 (commit awal `46bcd56`, 2026-07-17).

### Storefront pelanggan
- Guest mode: katalog & keranjang tanpa login; merge keranjang saat login
- Login/registrasi nomor HP + OTP (mock + adaptor WhatsApp)
- Katalog per hub, harga override, stok real-time, badge stok terbatas
- Pencarian + filter kategori
- Keranjang: max qty anti-hoarding, minimal order
- Checkout, pembayaran, timeout bayar
- Reservasi stok atomik anti-oversell
- Status order multi-tahap + timeline pelacakan
- Batalkan / refund / reorder / rating

### Mitra
- **Picker:** antrean FIFO, urutan rak, tandai habis, selesai packing
- **Driver:** pool tugas, navigasi Maps, bukti antar

### Admin
- Dashboard KPI, produk, inventori, order, voucher, audit log
- Webhook pembayaran (format Midtrans-ready, idempotent)

---

## v1.1.0 — Rebrand Sentra & model operasional

### Brand & domain
- Rebrand operasional ke **Sentra** (repo `sentra-new`)
- Produksi di **`web.locusgroup.site`** (Nginx → Next.js `:3007`)
- Palet brand merah `#A00000` / deep `#800000` + aksen kilat

### Auth OTP WhatsApp
- OTP via **Evolution API** (`wa.bergerak.space`, instance `kilatmart`)
- Tanpa password; JWT session (`jose`, cookie `km_user`)
- Fallback dev-mode jika WA gagal (kode tampil di UI)

### Pembayaran Pakasir
- Mode redirect ke Pakasir (QRIS / VA)
- Webhook `POST /api/payments/webhook` (verifikasi amount + settle)
- Simulasi bayar untuk sandbox/dev

### Drop point (pengambilan)
- 7 titik tetap: **PTO Holding + PTO 1–6**
- Checkout: pilih drop point (bukan alamat lengkap)
- **Tanpa ongkir, biaya layanan, dan ETA**
- Total = subtotal − diskon voucher

---

## v1.2.0 — Admin backoffice modern

### UX admin
- Sidebar gelap + **area konten light theme** (konsisten)
- CRUD via **modal popup** (bukan halaman terpisah) untuk produk, banner, kategori, announcement, pengguna, dll.
- Tabel admin seragam: **search + filter pill + pagination**
- Detail pesanan admin via **modal**
- **Bulk update status** pesanan (mis. massal → *Sedang Disiapkan*)

### Modul admin
- Produk, kategori, banner, inventori, voucher
- Pengguna (edit profil, block/unblock, verifikasi umur)
- Pengumuman / broadcast (`Announcement` + read-state per user)
- Live Chat inbox admin

### Notifikasi storefront
- Bell header → **popup modal** (bukan full page)
- Dot unread + mark as read / mark all

---

## v1.3.0 — UX storefront & layout isolation

### Halaman tanpa bottom nav (pola checkout)
| Halaman | Bottom UI | Back |
|---|---|---|
| `/checkout` | sticky bayar | Keranjang |
| `/akun/profil` | sticky **Simpan Perubahan** | Akun |
| `/pesanan/[id]` | — (panah kembali) | Pesanan Saya |
| `/masuk` | — (form OTP) | Beranda |

### Bottom nav auth
- **Guest:** pojok kanan = **Masuk** + icon login → `/masuk`
- **Logged-in:** pojok kanan = **Akun** + icon user → `/akun`

### Profil & pesanan
- Form perbarui profil (nama, email, tanggal lahir)
- Detail pesanan: timeline, drop point, aksi bayar/batal/reorder/rating

### UI produk
- Thumbnail **foto produk** di **keranjang**
- Thumbnail **foto produk** di **detail pesanan**
- Fallback emoji jika produk belum punya gambar

---

## v1.4.0 — Live Chat sesi (user ↔ admin) — *rilis terkini*

### Lifecycle sesi
1. Default **closed** — user belum bisa chat
2. **Mulai sesi:** pilih kategori masalah + detail singkat
3. Admin buka thread → **auto-join** + banner “Admin CS sudah bergabung”
4. Chat teks ± **lampiran gambar** (JPG/PNG/WEBP/GIF, max 2 MB)
5. **Akhiri sesi** (user atau admin) → hapus seluruh pesan + file
6. Setelah ditutup: wajib mulai sesi baru

### UX konfirmasi
- Modal **Batal / Ya, akhiri** (tanpa ketik ulang “AKHIRI”)
- Modal user di-portal ke `document.body` (`z-[200]`) agar **tidak tertutup bottom nav**

### Kategori default
Pesanan · Pembayaran · Produk · Akun · Lainnya

### Keamanan upload
- Validasi MIME + magic bytes
- File di `public/uploads/chat/{threadId}/` (gitignored)
- Server action body limit 4 MB

---

## Infrastruktur & ops

| Item | Detail |
|---|---|
| Path deploy | `/var/www/kilatmart` |
| Service | `kilatmart` (systemd) · port `3007` |
| Domain | `web.locusgroup.site` |
| DB | PostgreSQL + Prisma |
| WA OTP | Evolution API |
| Payment | Pakasir (`PAYMENT_MODE=pakasir`) |
| Git | `main` → GitHub `sentra-new` (`.env` tidak di-commit) |

---

## Catatan migrasi / yang belum (backlog opsional)

- Upload gambar produk ke object storage (S3/GCS) — kolom sudah siap
- Observabilitas (Sentry/APM)
- Cron proaktif expire order
- Notifikasi WA ke admin saat sesi chat baru
- Arsip chat (opsi tanpa hapus permanen)
- PWA install / push notification

---

## Cara merujuk versi

| Versi | Fokus |
|---|---|
| **1.0.0** | MVP PRD end-to-end |
| **1.1.0** | Sentra + OTP WA + Pakasir + drop point |
| **1.2.0** | Admin modal CRUD + bulk + announcement |
| **1.3.0** | Layout isolation + auth nav + foto produk |
| **1.4.0** | Live chat sesi + lampiran gambar |

*Changelog ini disusun dari baseline README, evolusi fitur di codebase, dan rilis operasional hingga 21 Juli 2026.*
