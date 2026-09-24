"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveHub } from "@/lib/storefront";

async function requireAdmin() {
  return getSession("admin");
}

export type BundleDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  is_active: boolean;
  availableStock: number;
  items: {
    id: string;
    product_id: string;
    product_name: string;
    variant_id: string | null;
    variant_name: string | null;
    qty: number;
    unit_price: number;
  }[];
};

/** Hitung stok dinamis paket bundling berdasarkan stok produk satuan di Hub aktif */
export async function getActiveBundles(): Promise<BundleDetail[]> {
  const hub = await getActiveHub();
  if (!hub) return [];

  const bundles = await db.productBundle.findMany({
    where: { is_active: true },
    include: {
      items: {
        include: {
          product: {
            include: {
              variants: { where: { is_active: true } },
              hub_stocks: { where: { hub_id: hub.id } },
            },
          },
          variant: {
            include: {
              hub_stocks: { where: { hub_id: hub.id } },
            },
          },
        },
      },
    },
    orderBy: { sort_order: "asc" },
  });

  return bundles.map((b) => {
    // Hitung stok tersedia untuk paket:
    // min(floor(stock_tersedia_item / qty_dibutuhkan))
    let bundleStock = 999999;

    const mappedItems = b.items.map((item) => {
      // Tentukan variant & hub stock
      const targetVariant =
        item.variant ||
        item.product.variants.find((v) => v.is_default) ||
        item.product.variants[0];

      const hubStock =
        item.variant?.hub_stocks?.[0] ||
        item.product.hub_stocks.find((hs) => hs.variant_id === targetVariant?.id);

      const availableItemStock = hubStock
        ? Math.max(0, hubStock.stock_qty - hubStock.reserved_qty)
        : 0;

      const possibleForThisItem = Math.floor(availableItemStock / Math.max(1, item.qty));
      if (possibleForThisItem < bundleStock) {
        bundleStock = possibleForThisItem;
      }

      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product.name,
        variant_id: targetVariant?.id || null,
        variant_name: targetVariant?.name || null,
        qty: item.qty,
        unit_price: targetVariant?.base_price || item.product.base_price,
      };
    });

    if (b.items.length === 0) {
      bundleStock = 0;
    }

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      price: b.price,
      compare_at_price: b.compare_at_price,
      image_url: b.image_url,
      is_active: b.is_active,
      availableStock: Math.max(0, bundleStock),
      items: mappedItems,
    };
  });
}

/** Admin: Ambil semua data paket bundling */
export async function getAdminBundles() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const bundles = await db.productBundle.findMany({
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const products = await db.product.findMany({
    where: { status: "active" },
    include: {
      variants: { where: { is_active: true } },
    },
    orderBy: { name: "asc" },
  });

  return { bundles, products };
}

/** Admin: Simpan atau update paket bundling */
export async function upsertBundle(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = parseInt(String(formData.get("price") || "0"), 10) || 0;
  const compareAtRaw = String(formData.get("compare_at_price") || "").trim();
  const compare_at_price = compareAtRaw ? parseInt(compareAtRaw, 10) || null : null;
  const image_url = String(formData.get("image_url") || "").trim() || null;
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";
  const itemsJson = String(formData.get("items_json") || "[]").trim();

  if (!name) return { error: "Nama paket wajib diisi." };
  if (price <= 0) return { error: "Harga paket harus lebih besar dari 0." };

  type RawItem = { product_id: string; variant_id?: string | null; qty: number };
  let items: RawItem[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: "Format komponen produk paket tidak valid." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Pilih minimal 1 produk penyusun untuk paket ini." };
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    if (id) {
      // Update bundle
      await db.$transaction(async (tx) => {
        await tx.productBundle.update({
          where: { id },
          data: {
            name,
            slug,
            description,
            price,
            compare_at_price,
            image_url,
            is_active,
          },
        });

        // Hapus item lama dan ganti dengan item baru
        await tx.productBundleItem.deleteMany({ where: { bundle_id: id } });
        await tx.productBundleItem.createMany({
          data: items.map((i) => ({
            bundle_id: id,
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            qty: Math.max(1, i.qty || 1),
          })),
        });
      });
    } else {
      // Create new bundle
      await db.productBundle.create({
        data: {
          name,
          slug,
          description,
          price,
          compare_at_price,
          image_url,
          is_active,
          items: {
            create: items.map((i) => ({
              product_id: i.product_id,
              variant_id: i.variant_id || null,
              qty: Math.max(1, i.qty || 1),
            })),
          },
        },
      });
    }
  } catch (err: unknown) {
    console.error("[upsertBundle]", err);
    return { error: "Gagal menyimpan paket bundling. Pastikan nama paket unik." };
  }

  revalidatePath("/admin/bundling");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Admin: Hapus paket bundling */
export async function deleteBundle(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi berakhir." };

  try {
    await db.productBundle.delete({ where: { id } });
  } catch {
    // Jika ada foreign key di cart / order, soft delete (nonaktifkan)
    await db.productBundle.update({ where: { id }, data: { is_active: false } });
  }

  revalidatePath("/admin/bundling");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
