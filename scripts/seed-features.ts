import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding Batch 29, Paket A, dan Voucher Paket...");

  // 1. Inisialisasi Batch 29
  const batch = await db.purchaseBatch.upsert({
    where: { id: "batch-29-sentra" },
    update: {
      name: "Batch 29",
      is_active: true,
      open_day: 3, // Rabu
      open_time: "07:00",
      close_day: 4, // Kamis
      close_time: "20:00",
      override_mode: "auto",
      closed_message:
        "Pembelian Sentra New sedang ditutup. Batch 29 dibuka setiap hari Rabu pk 07:00 - Kamis pk 20:00 WIB. (Produk Order Langsung tetap buka di Hub PTO Bandung).",
    },
    create: {
      id: "batch-29-sentra",
      name: "Batch 29",
      description: "Melanjutkan sistem batch Sentra Old",
      is_active: true,
      open_day: 3, // Rabu
      open_time: "07:00",
      close_day: 4, // Kamis
      close_time: "20:00",
      override_mode: "auto",
      closed_message:
        "Pembelian Sentra New sedang ditutup. Batch 29 dibuka setiap hari Rabu pk 07:00 - Kamis pk 20:00 WIB. (Produk Order Langsung tetap buka di Hub PTO Bandung).",
    },
  });
  console.log("✅ Batch 29 seeded:", batch.name);

  // 2. Cari produk penyusun Paket A: Deterjen, Air Galon, Susu
  const [deterjen, airGalon, susu] = await Promise.all([
    db.product.findFirst({
      where: { name: { contains: "Deterjen", mode: "insensitive" } },
      include: { variants: true },
    }),
    db.product.findFirst({
      where: { name: { contains: "Air Galon", mode: "insensitive" } },
      include: { variants: true },
    }),
    db.product.findFirst({
      where: { name: { contains: "Susu", mode: "insensitive" } },
      include: { variants: true },
    }),
  ]);

  if (deterjen && airGalon && susu) {
    const deterjenVar = deterjen.variants[0];
    const airGalonVar = airGalon.variants[0];
    const susuVar = susu.variants[0];

    const normalTotal =
      deterjen.base_price * 1 + airGalon.base_price * 1 + susu.base_price * 2;
    const bundlePrice = Math.round(normalTotal * 0.88); // Diskon ~12% untuk harga paket

    const bundle = await db.productBundle.upsert({
      where: { slug: "paket-a" },
      update: {
        name: "Paket A (Sembako & Kebersihan)",
        description:
          "Isi paket: 1 pcs Deterjen Cair 800ml, 1 pcs Air Galon 19L, dan 2 pcs Susu UHT 1L.",
        price: bundlePrice,
        compare_at_price: normalTotal,
        is_active: true,
      },
      create: {
        name: "Paket A (Sembako & Kebersihan)",
        slug: "paket-a",
        description:
          "Isi paket: 1 pcs Deterjen Cair 800ml, 1 pcs Air Galon 19L, dan 2 pcs Susu UHT 1L.",
        price: bundlePrice,
        compare_at_price: normalTotal,
        is_active: true,
      },
    });

    // Buat item komponen Paket A
    await db.productBundleItem.deleteMany({ where: { bundle_id: bundle.id } });
    await db.productBundleItem.createMany({
      data: [
        {
          bundle_id: bundle.id,
          product_id: deterjen.id,
          variant_id: deterjenVar?.id || null,
          qty: 1, // 1 pcs deterjen
        },
        {
          bundle_id: bundle.id,
          product_id: airGalon.id,
          variant_id: airGalonVar?.id || null,
          qty: 1, // 1 pcs air galon
        },
        {
          bundle_id: bundle.id,
          product_id: susu.id,
          variant_id: susuVar?.id || null,
          qty: 2, // 2 pcs susu
        },
      ],
    });
    console.log("✅ Paket A seeded dengan 1x Deterjen, 1x Air Galon, 2x Susu. Harga:", bundlePrice);
  } else {
    console.warn("⚠️ Produk deterjen/air galon/susu belum ditemukan di database.");
  }

  // 3. Voucher Khusus Paket
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  await db.voucher.upsert({
    where: { code: "DISKONPAKET" },
    update: {
      bundle_only: true,
      name: "Diskon Khusus Paket Bundling Rp10.000",
      value: 10000,
      min_order_amount: 50000,
    },
    create: {
      code: "DISKONPAKET",
      name: "Diskon Khusus Paket Bundling Rp10.000",
      type: "fixed",
      value: 10000,
      min_order_amount: 50000,
      quota_total: 1000,
      quota_per_user: 5,
      bundle_only: true,
      start_at: now,
      end_at: nextYear,
    },
  });
  console.log("✅ Voucher DISKONPAKET (Khusus Paket) seeded");

  // 4. Pastikan ada contoh Produk Order Langsung di Hub PTO Bandung
  const directCount = await db.directProduct.count();
  if (directCount < 3) {
    const directSamples = [
      {
        name: "Kopi Susu Dingin Cup (Hub PTO)",
        price: 15000,
        stock_qty: 50,
        sku: "DIR-KOP-01",
        qr_token: "pto-kopi-dingin-01",
        category: "Order Langsung",
        description: "Langsung ambil di showcase chiller Hub PTO Bandung.",
      },
      {
        name: "Roti Coklat Fresh (Hub PTO)",
        price: 12000,
        stock_qty: 40,
        sku: "DIR-ROT-01",
        qr_token: "pto-roti-coklat-01",
        category: "Order Langsung",
        description: "Roti lembut siap santap di rak kasir Hub PTO.",
      },
      {
        name: "Air Mineral Dingin 600ml (Hub PTO)",
        price: 4000,
        stock_qty: 100,
        sku: "DIR-AIR-01",
        qr_token: "pto-air-dingin-01",
        category: "Order Langsung",
        description: "Air mineral dingin di kulkas Hub PTO Bandung.",
      },
    ];

    for (const item of directSamples) {
      await db.directProduct.upsert({
        where: { qr_token: item.qr_token },
        update: {},
        create: item,
      });
    }
    console.log("✅ Produk Order Langsung seeded di Hub PTO Bandung");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
