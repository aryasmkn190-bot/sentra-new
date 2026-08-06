"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveHub } from "@/lib/storefront";

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
    await db.cartItem.upsert({
      where: { cart_id_variant_id: { cart_id: cart.id, variant_id: variantId } },
      update: { qty: capped },
      create: {
        cart_id: cart.id,
        product_id: variant.product_id,
        variant_id: variantId,
        qty: capped,
      },
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
