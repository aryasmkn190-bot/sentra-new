"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveHub } from "@/lib/storefront";
import { getCurrentBatchStatus } from "@/lib/batch";

async function resolveCart() {
  const session = await getSession("user");
  const hub = await getActiveHub();
  if (!hub) throw new Error("Belum ada hub aktif");

  if (session) {
    const existing = await db.cart.findFirst({ where: { user_id: session.sub, status: "active" } });
    if (existing) return existing;
    return db.cart.create({ data: { user_id: session.sub, hub_id: hub.id } });
  }

  const jar = await cookies();
  let token = jar.get("km_cart")?.value;
  if (token) {
    const existing = await db.cart.findFirst({ where: { session_token: token, status: "active" } });
    if (existing) return existing;
  }
  token = randomUUID();
  jar.set("km_cart", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
  return db.cart.create({ data: { session_token: token, hub_id: hub.id } });
}

/**
 * Set qty di keranjang per VARIANT (0 = hapus).
 * productId opsional — divalidasi lewat variant.product_id.
 */
export async function setCartQty(variantId: string, qty: number) {
  if (qty > 0) {
    const batch = await getCurrentBatchStatus();
    if (batch.isActive && !batch.isOpen) {
      return { error: batch.closedMessage };
    }
  }

  const cart = await resolveCart();
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || !variant.is_active || variant.product.status !== "active") {
    return { error: "Varian produk tidak tersedia" };
  }

  if (qty <= 0) {
    await db.cartItem.deleteMany({ where: { cart_id: cart.id, variant_id: variantId } });
  } else {
    const stock = await db.hubStock.findUnique({
      where: { hub_id_variant_id: { hub_id: cart.hub_id, variant_id: variantId } },
    });
    const available = stock ? stock.stock_qty - stock.reserved_qty : 0;
    const capped = Math.min(qty, variant.product.max_qty_per_order, Math.max(available, 0));
    if (capped <= 0) return { error: "Stok habis di hub kamu" };

    const existing = await db.cartItem.findFirst({
      where: { cart_id: cart.id, variant_id: variantId },
    });
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { qty: capped },
      });
    } else {
      await db.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id: variant.product_id,
          variant_id: variantId,
          qty: capped,
        },
      });
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Set qty di keranjang untuk PRODUK BUNDLING / PAKET.
 * Mengkonsumsi stok dari produk satuan penyusunnya secara dinamis.
 */
export async function setBundleCartQty(bundleId: string, qty: number) {
  if (qty > 0) {
    const batch = await getCurrentBatchStatus();
    if (batch.isActive && !batch.isOpen) {
      return { error: batch.closedMessage };
    }
  }

  const cart = await resolveCart();
  const bundle = await db.productBundle.findUnique({
    where: { id: bundleId },
    include: {
      items: {
        include: {
          product: {
            include: {
              variants: { where: { is_active: true } },
              hub_stocks: { where: { hub_id: cart.hub_id } },
            },
          },
          variant: {
            include: {
              hub_stocks: { where: { hub_id: cart.hub_id } },
            },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.is_active) {
    return { error: "Paket bundling tidak tersedia" };
  }

  if (qty <= 0) {
    await db.cartItem.deleteMany({ where: { cart_id: cart.id, bundle_id: bundleId } });
  } else {
    // Validasi ketersediaan stok tiap item penyusun
    let maxPossibleBundle = 999999;
    for (const item of bundle.items) {
      const targetVariant =
        item.variant ||
        item.product.variants.find((v) => v.is_default) ||
        item.product.variants[0];

      const hubStock =
        item.variant?.hub_stocks?.[0] ||
        item.product.hub_stocks.find((hs) => hs.variant_id === targetVariant?.id);

      const available = hubStock ? Math.max(0, hubStock.stock_qty - hubStock.reserved_qty) : 0;
      const possible = Math.floor(available / Math.max(1, item.qty));
      if (possible < maxPossibleBundle) {
        maxPossibleBundle = possible;
      }
    }

    if (bundle.items.length === 0 || maxPossibleBundle <= 0) {
      return { error: "Stok produk untuk paket ini sedang habis" };
    }

    const capped = Math.min(qty, 20, maxPossibleBundle);
    if (capped <= 0) return { error: "Stok produk tidak cukup untuk paket ini" };

    const existing = await db.cartItem.findFirst({
      where: { cart_id: cart.id, bundle_id: bundleId },
    });

    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { qty: capped },
      });
    } else {
      await db.cartItem.create({
        data: {
          cart_id: cart.id,
          bundle_id: bundleId,
          qty: capped,
        },
      });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
