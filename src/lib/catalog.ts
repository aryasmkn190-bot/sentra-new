import { db } from "./db";
import { getActiveCart, getActiveHub } from "./storefront";
import type { ProductCardData } from "@/components/ProductCard";

/** Ambil produk aktif utk hub aktif + status stok + qty di keranjang (FR-2.3, FR-3.5). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProductCards(where: any, take = 60): Promise<ProductCardData[]> {
  const hub = await getActiveHub();
  if (!hub) return [];
  const [products, cart] = await Promise.all([
    db.product.findMany({
      where: { status: "active", ...where },
      include: { 
        category: true, 
        hub_stocks: { where: { hub_id: hub.id } },
        images: { where: { is_primary: true } }
      },
      orderBy: { created_at: "asc" },
      take,
    }),
    getActiveCart(),
  ]);
  const cartQty = new Map<string, number>();
  cart?.items.forEach((i) => cartQty.set(i.product_id, i.qty));

  return products.map((p) => {
    const stock = p.hub_stocks[0];
    const available = stock ? Math.max(stock.stock_qty - stock.reserved_qty, 0) : 0;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      unit: p.unit,
      price: stock?.price_override ?? p.base_price,
      compareAt: p.compare_at_price,
      icon: p.category.icon,
      imageUrl: p.images?.[0]?.image_url || null,
      available,
      maxPerOrder: p.max_qty_per_order,
      inCartQty: cartQty.get(p.id) ?? 0,
    };
  });
}
