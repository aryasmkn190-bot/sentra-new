# KilatMart ⚡ — Quick Commerce Web App

Implementasi MVP dari PRD KilatMart v1.0: web app pelanggan (mobile-first PWA), panel admin/backoffice, aplikasi mitra picker & driver — dalam satu codebase Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL.

## Cakupan yang sudah berjalan end-to-end

| Alur PRD | Status |
|---|---|
| Guest mode: jelajah katalog & keranjang tanpa login (FR-1.1, FR-5.2) | ✅ termasuk merge keranjang saat login |
| Login/registrasi HP + OTP, maks 3 permintaan/10 menit (FR-1.2) | ✅ mode mock & adaptor WhatsApp |
| Cek area layanan point-in-polygon → hub otomatis + waiting list (FR-2.x) | ✅ |
| Katalog per hub, harga override per hub, stok real-time, badge stok terbatas (FR-3.x) | ✅ |
| Pencarian dengan filter kategori (FR-4.1 dasar) | ✅ ILIKE; siap diganti Meilisearch |
| Keranjang: max qty anti-hoarding, min. order, progress gratis ongkir (FR-5.x) | ✅ |
| Checkout: ongkir dinamis per zona, voucher tervalidasi, ETA, timeout bayar 15 mnt (FR-6.x) | ✅ |
| **Reservasi stok atomik anti-oversell** (§10.3.5 #2) | ✅ UPDATE bersyarat + stock_movements |
| Status order 7 tahap + riwayat + timeline pelacakan (FR-7.x) | ✅ |
| Pembatalan sebelum picking, refund penuh/parsial, reorder 1 klik (FR-7.4, 7.6) | ✅ |
| Rating pesanan (FR-9.1) | ✅ |
| App picker: antrean FIFO, urutan rak, tandai habis, selesai packing (FR-12.1–12.3) | ✅ |
| App driver: pool tugas, navigasi Google Maps, bukti antar (FR-12.4–12.5) | ✅ |
| Admin: dashboard KPI (SLA ≤30 mnt), produk, inventori + penyesuaian, order + override + refund, voucher, audit log (FR-11.x) | ✅ |
| Webhook pembayaran format Midtrans, verifikasi signature SHA-512, idempotent | ✅ |

Skema database mengikuti ERD PRD §10.3 secara penuh (termasuk tabel yang UI-nya belum dibangun: `referrals`, `freshness_claims`, `notifications`, `articles` — siap dipakai fase berikutnya).

## Menjalankan secara lokal

Prasyarat: Node.js 20+, PostgreSQL 15+.

```bash
cp .env.example .env          # sesuaikan DATABASE_URL & SESSION_SECRET
npm install
npx prisma db push            # buat skema
npm run db:seed               # data awal (hub, katalog, admin, mitra, voucher)
npm run dev                   # http://localhost:3000
```

### Akun demo (dari seed)

| Peran | Akses | Kredensial |
|---|---|---|
| Pelanggan | `/masuk` | nomor HP apa pun format `08…` — kode OTP tampil di layar (mode mock) |
| Admin | `/admin/login` | `admin@kilatmart.id` / `admin12345` |
| Picker | `/partner/login` | `081100000001` (OTP mock) |
| Driver | `/partner/login` | `081100000002` (OTP mock) |

### Uji alur lengkap (happy path §11.1)

1. Buka `/`, tambah beberapa produk ke keranjang (boleh tanpa login).
2. Keranjang → checkout → login OTP → tambah alamat. Untuk masuk zona seed, pakai koordinat dekat hub: lat `-6.2436`, lng `106.8006`. Coba voucher `BARUKILAT`.
3. Buat pesanan → di halaman pesanan klik **Simulasi bayar (mode dev)** → status jadi *Dikonfirmasi*, tugas picking otomatis dibuat.
4. Login sebagai picker → ambil tugas → tandai item (coba tandai satu **Habis** untuk melihat refund parsial otomatis) → **Selesai packing**.
5. Login sebagai driver → ambil tugas antar → berangkat → tiba → selesai. Pesanan menjadi *Selesai*.
6. Kembali sebagai pelanggan → beri rating. Cek dashboard admin: KPI ≤30 menit terhitung.

## Konfigurasi produksi

| Variabel | Nilai produksi |
|---|---|
| `SESSION_SECRET` | string acak ≥32 karakter (wajib diganti) |
| `OTP_MODE` | `whatsapp` — isi kredensial provider di `src/lib/otp.ts → sendViaProvider()` |
| `PAYMENT_MODE` | `midtrans` + `MIDTRANS_SERVER_KEY` — daftarkan webhook `https://domainmu/api/payments/webhook` di dashboard Midtrans; tombol simulasi otomatis nonaktif |

### Checklist sebelum go-live (dari PRD §13–14 & NFR)

- [ ] Kontrak payment gateway (Midtrans/Xendit) + uji webhook sandbox → production.
- [ ] Provider OTP WhatsApp/SMS aktif.
- [ ] Google Maps Platform: ganti input lat/lng manual di form alamat dengan pin peta (geocoding + place autocomplete), dan `estimateEtaMinutes()` di `src/lib/geo.ts` dengan Distance Matrix.
- [ ] Migrasikan `service_zones.polygon` (JSON) ke PostGIS `geometry` bila zona mulai kompleks/banyak — logika cek ada di `src/actions/address.ts → findServingZone`.
- [ ] Redis untuk cache katalog & rate limiting API (rate limit OTP sudah di level DB); antrean (RabbitMQ/Kafka) untuk notifikasi & pipeline order saat trafik naik.
- [ ] Upload gambar produk & bukti antar ke object storage (S3/GCS) — kolom `product_images.image_url` & `delivery_tasks.proof_photo_url` sudah siap.
- [ ] Observabilitas: Sentry + APM + alerting order stuck / payment failure spike (NFR).
- [ ] Cron ringan untuk membatalkan order kedaluwarsa secara proaktif (saat ini lazy-check di halaman pesanan + webhook `expire`).
- [ ] Panel admin: jika ingin sesuai §10.4 (template Metronic berbayar), struktur halaman `/admin` saat ini memetakan 1:1 ke modul FR-11.x sehingga migrasi hanya mengganti lapisan UI.
- [ ] Review keamanan: HTTPS penuh, header keamanan, penetration test OWASP Top 10, kebijakan privasi & hak hapus akun (kolom `users.deleted_at` sudah tersedia).

## Struktur kode

```
prisma/schema.prisma      ERD §10.3 lengkap (uang = Int Rupiah)
prisma/seed.ts            hub, zona, katalog 33 SKU, admin, mitra, voucher
src/lib/                  db, session (JWT), otp, geo, stock (atomik), orders, payment
src/actions/              server actions: auth, cart, address, checkout, partner, admin
src/app/(store)/          app pelanggan: beranda, kategori, produk, cari, keranjang,
                          checkout, pesanan (+tracking), masuk, akun
src/app/admin/            backoffice: dashboard, produk, inventori, pesanan, voucher
src/app/partner/          picker (antrean & picking) dan driver (antar & bukti)
src/app/api/payments/     webhook gateway (idempotent, signature SHA-512)
src/middleware.ts         proteksi rute /admin, /partner, /checkout, /pesanan, /akun
```

## Keputusan teknis penting

1. **Anti-oversell**: reservasi memakai `UPDATE … WHERE stock_qty - reserved_qty >= qty` dalam transaksi — tidak ada window race antara cek dan tulis. Setiap pergerakan tercatat di `stock_movements` (reserve/release/out/in).
2. **Idempotensi webhook**: pembayaran berstatus `paid` tidak diproses ulang; retry gateway aman.
3. **Pola snapshot**: alamat, nama produk, dan harga dibekukan di order (§10.3.5 #1).
4. **Uang sebagai integer Rupiah** — tanpa floating point, tanpa sen.
5. **Guest cart** memakai cookie token; otomatis merge saat login (§10.3.5 #4).
