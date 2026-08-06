/**
 * Seed data KilatMart — 1 dark store (sesuai asumsi PRD §14), katalog awal,
 * admin, mitra picker & driver, voucher, dan banner.
 * Jalankan: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // ===== Roles & Admin =====
  const superRole = await db.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: { name: "super_admin", permissions: ["*"] },
  });
  await db.role.upsert({
    where: { name: "ops" },
    update: {},
    create: { name: "ops", permissions: ["catalog", "inventory", "orders"] },
  });

  await db.adminUser.upsert({
    where: { email: "admin@sentra.id" },
    update: {},
    create: {
      role_id: superRole.id,
      name: "Admin Sentra",
      email: "admin@sentra.id",
      password_hash: await bcrypt.hash("admin12345", 10),
    },
  });

  // ===== Hub & Zona (Kebayoran Baru, Jakarta Selatan — contoh) =====
  const hub = await db.hub.upsert({
    where: { code: "JKT-KBY-01" },
    update: {},
    create: {
      code: "JKT-KBY-01",
      name: "Hub Kebayoran Baru",
      address: "Jl. Wolter Monginsidi No. 88, Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2436,
      longitude: 106.8006,
    },
  });

  // Polygon persegi ± ~2,5 km di sekitar hub
  const d = 0.023;
  const existingZone = await db.serviceZone.findFirst({ where: { hub_id: hub.id } });
  if (!existingZone) {
    await db.serviceZone.create({
      data: {
        hub_id: hub.id,
        name: "Zona Kebayoran",
        polygon: [
          [hub.latitude - d, hub.longitude - d],
          [hub.latitude - d, hub.longitude + d],
          [hub.latitude + d, hub.longitude + d],
          [hub.latitude + d, hub.longitude - d],
        ],
        delivery_fee_base: 10000,
        free_delivery_threshold: 100000,
        min_order_amount: 30000,
      },
    });
  }

  // ===== Mitra =====
  await db.partner.upsert({
    where: { phone: "081100000001" },
    update: {},
    create: { hub_id: hub.id, role: "picker", name: "Andi (Picker)", phone: "081100000001" },
  });
  await db.partner.upsert({
    where: { phone: "081100000002" },
    update: {},
    create: {
      hub_id: hub.id,
      role: "driver",
      name: "Budi (Driver)",
      phone: "081100000002",
      vehicle_plate: "B 1234 KLT",
    },
  });

  // ===== Kategori =====
  const cats: Array<[string, string, string]> = [
    ["Sayur Segar", "sayur-segar", "🥬"],
    ["Buah", "buah", "🍎"],
    ["Daging & Ikan", "daging-ikan", "🥩"],
    ["Susu & Telur", "susu-telur", "🥛"],
    ["Snack", "snack", "🍪"],
    ["Minuman", "minuman", "🧃"],
    ["Ibu & Bayi", "ibu-bayi", "🍼"],
    ["Obat & Vitamin", "obat-vitamin", "💊"],
    ["Perawatan Rumah", "perawatan-rumah", "🧹"],
    ["Gas & Galon", "gas-galon", "🫙"],
  ];
  const catMap: Record<string, string> = {};
  for (const [i, [name, slug, icon]] of cats.entries()) {
    const c = await db.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, icon, sort_order: i },
    });
    catMap[slug] = c.id;
  }

  // ===== Produk (nama, slug-kategori, harga, hargaCoret?, unit, rak, stok) =====
  type P = [string, string, number, number | null, string, string, number];
  const products: P[] = [
    ["Bayam Hijau Ikat", "sayur-segar", 6500, null, "ikat", "A1-01", 40],
    ["Kangkung Ikat", "sayur-segar", 5500, null, "ikat", "A1-02", 40],
    ["Brokoli 250g", "sayur-segar", 14500, 17000, "pack", "A1-03", 25],
    ["Tomat Merah 500g", "sayur-segar", 9500, null, "pack", "A1-04", 35],
    ["Cabai Merah Keriting 100g", "sayur-segar", 8500, null, "pack", "A1-05", 30],
    ["Pisang Cavendish 1 Sisir", "buah", 22000, 26000, "sisir", "A2-01", 20],
    ["Apel Fuji 500g", "buah", 24500, null, "pack", "A2-02", 22],
    ["Jeruk Santang 500g", "buah", 19900, 23000, "pack", "A2-03", 25],
    ["Semangka Merah Potong 500g", "buah", 12000, null, "pack", "A2-04", 15],
    ["Dada Ayam Fillet 500g", "daging-ikan", 29500, 34000, "pack", "B1-01", 18],
    ["Daging Sapi Slice 250g", "daging-ikan", 36500, null, "pack", "B1-02", 12],
    ["Ikan Salmon Fillet 200g", "daging-ikan", 49900, 56000, "pack", "B1-03", 10],
    ["Udang Kupas 250g", "daging-ikan", 32500, null, "pack", "B1-04", 14],
    ["Susu UHT Full Cream 1L", "susu-telur", 19500, null, "liter", "C1-01", 48],
    ["Telur Ayam Negeri 10 Butir", "susu-telur", 27500, 29500, "pack", "C1-02", 30],
    ["Keju Cheddar 160g", "susu-telur", 15900, null, "pcs", "C1-03", 26],
    ["Yogurt Drink Stroberi 200ml", "susu-telur", 8900, null, "pcs", "C1-04", 40],
    ["Keripik Kentang 68g", "snack", 11500, 13000, "pcs", "D1-01", 60],
    ["Cokelat Batang 45g", "snack", 12500, null, "pcs", "D1-02", 55],
    ["Biskuit Malkist 300g", "snack", 10900, null, "pack", "D1-03", 40],
    ["Air Mineral 600ml", "minuman", 3500, null, "pcs", "D2-01", 120],
    ["Kopi Susu Botol 220ml", "minuman", 9500, 11000, "pcs", "D2-02", 45],
    ["Teh Kotak 300ml", "minuman", 4500, null, "pcs", "D2-03", 80],
    ["Popok Bayi M isi 34", "ibu-bayi", 52500, 58000, "pack", "E1-01", 15],
    ["Bubur Bayi 120g", "ibu-bayi", 14500, null, "pcs", "E1-02", 20],
    ["Paracetamol 500mg Strip", "obat-vitamin", 6500, null, "strip", "E2-01", 50],
    ["Vitamin C 1000mg Tube", "obat-vitamin", 32500, 36000, "pcs", "E2-02", 25],
    ["Minyak Kayu Putih 60ml", "obat-vitamin", 24500, null, "pcs", "E2-03", 20],
    ["Sabun Cuci Piring 780ml", "perawatan-rumah", 14900, null, "pcs", "F1-01", 30],
    ["Deterjen Cair 800ml", "perawatan-rumah", 21500, 24000, "pcs", "F1-02", 25],
    ["Tisu 250 Lembar", "perawatan-rumah", 13500, null, "pack", "F1-03", 40],
    ["Air Galon 19L (Tukar)", "gas-galon", 21000, null, "galon", "G1-01", 25],
    ["Gas LPG 3kg (Tukar)", "gas-galon", 23000, null, "tabung", "G1-02", 15],
  ];

  for (const [i, [name, catSlug, price, compareAt, unit, rack, stock]] of products.entries()) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const product = await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        sku: `SKU-${String(i + 1).padStart(4, "0")}`,
        category_id: catMap[catSlug],
        name,
        slug,
        description: `${name} berkualitas, dipilih langsung dari pemasok terpercaya. Jaminan Segar KilatMart: bermasalah? Kami ganti atau refund.`,
        unit,
        base_price: price,
        compare_at_price: compareAt,
      },
    });
    const sku = product.sku;
    const variant = await db.productVariant.upsert({
      where: { sku: `${sku}-DEF` },
      update: {
        name: "Standar",
        unit,
        base_price: price,
        compare_at_price: compareAt,
        is_default: true,
        is_active: true,
      },
      create: {
        product_id: product.id,
        sku: `${sku}-DEF`,
        name: "Standar",
        unit,
        base_price: price,
        compare_at_price: compareAt,
        is_default: true,
        is_active: true,
        sort_order: 0,
      },
    });
    await db.hubStock.upsert({
      where: { hub_id_variant_id: { hub_id: hub.id, variant_id: variant.id } },
      update: { stock_qty: stock, rack_location: rack },
      create: {
        hub_id: hub.id,
        product_id: product.id,
        variant_id: variant.id,
        stock_qty: stock,
        rack_location: rack,
      },
    });
  }

  // ===== Voucher =====
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  await db.voucher.upsert({
    where: { code: "BARUKILAT" },
    update: {},
    create: {
      code: "BARUKILAT",
      name: "Diskon Pengguna Baru Rp20.000",
      type: "fixed",
      value: 20000,
      min_order_amount: 50000,
      quota_total: 1000,
      quota_per_user: 1,
      target_segment: "new_user",
      start_at: now,
      end_at: nextYear,
    },
  });
  await db.voucher.upsert({
    where: { code: "HEMAT10" },
    update: {},
    create: {
      code: "HEMAT10",
      name: "Diskon 10% maks Rp15.000",
      type: "percentage",
      value: 10,
      max_discount: 15000,
      min_order_amount: 75000,
      quota_total: 500,
      quota_per_user: 3,
      start_at: now,
      end_at: nextYear,
    },
  });

  // ===== Banner =====
  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        {
          title: "Pengguna baru? Pakai kode BARUKILAT — hemat Rp20.000",
          target_url: "/cari?q=promo",
          placement: "home_top",
          sort_order: 0,
          start_at: now,
          end_at: nextYear,
        },
        {
          title: "Gratis ongkir untuk belanja di atas Rp100.000",
          target_url: "/kategori",
          placement: "home_top",
          sort_order: 1,
          start_at: now,
          end_at: nextYear,
        },
      ],
    });
  }

  console.log("Seed selesai ✅");
  console.log("Admin  : admin@sentra.id / admin12345");
  console.log("Picker : 081100000001 (login OTP mode mock)");
  console.log("Driver : 081100000002 (login OTP mode mock)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
