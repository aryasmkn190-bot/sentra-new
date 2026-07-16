import { cookies } from "next/headers";
import { db } from "./db";
import { getSession } from "./session";

/** Hub aktif: dari cookie km_hub (di-set saat pilih alamat), fallback hub aktif pertama. */
export async function getActiveHub() {
  const jar = await cookies();
  const hubId = jar.get("km_hub")?.value;
  if (hubId) {
    const hub = await db.hub.findFirst({ where: { id: hubId, is_active: true } });
    if (hub) return hub;
  }
  return db.hub.findFirst({ where: { is_active: true }, orderBy: { created_at: "asc" } });
}

/** Keranjang aktif: milik user login, atau guest via cookie km_cart (FR-5.2). */
export async function getActiveCart(createIfMissing = false) {
  const jar = await cookies();
  const session = await getSession("user");
  const hub = await getActiveHub();
  if (!hub) return null;

  if (session) {
    let cart = await db.cart.findFirst({
      where: { user_id: session.sub, status: "active" },
      include: { items: { include: { product: { include: { images: true } } }, orderBy: { created_at: "asc" } } },
    });
    if (!cart && createIfMissing) {
      cart = await db.cart.create({
        data: { user_id: session.sub, hub_id: hub.id },
        include: { items: { include: { product: { include: { images: true } } } } },
      });
    }
    return cart;
  }

  const token = jar.get("km_cart")?.value;
  if (!token) return null;
  return db.cart.findFirst({
    where: { session_token: token, status: "active" },
    include: { items: { include: { product: { include: { images: true } } }, orderBy: { created_at: "asc" } } },
  });
}

export async function cartItemCount(): Promise<number> {
  const cart = await getActiveCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.qty, 0);
}
