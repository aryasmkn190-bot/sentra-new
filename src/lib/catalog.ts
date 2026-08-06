import { db } from "./db";
import { getActiveCart, getActiveHub } from "./storefront";
import type { ProductCardData } from "@/components/ProductCard";
import { bestOfferScore } from "@/lib/product-stats";

type LoadOptions = {
  bestOffers?: boolean;
  take?: number;
};

type StockRow = {
  variant_id: string;
  stock_qty: number;
  reserved_qty: number;
  price_override: number | null;
};

type VariantRow = {
  id: string;
  name: string;
  unit: string;
  base_price: number;
  compare_at_price: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  images?: { image_url: string; is_primary?: boolean }[];
};

function pickDefaultVariant(variants: VariantRow[]): VariantRow | null {
  const active = variants.filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order);
  if (active.length === 0) return null;
  return active.find((v) => v.is_default) ?? active[0];
}

function stockOf(stocks: StockRow[], variantId: string) {
  return stocks.find((s) => s.variant_id === variantId) ?? null;
}

function mapProductCard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any,
  cartQtyByVariant: Map<string, number>
): ProductCardData | null {
  const variants = (p.variants ?? []) as VariantRow[];
  const stocks = (p.hub_stocks ?? []) as StockRow[];
  const def = pickDefaultVariant(variants);
  if (!def) return null;

  const stock = stockOf(stocks, def.id);
  const available = stock ? Math.max(stock.stock_qty - stock.reserved_qty, 0) : 0;
  const price = stock?.price_override ?? def.base_price;
  const compareAt = def.compare_at_price ?? p.compare_at_price;
  const multi = variants.filter((v) => v.is_active).length > 1;

  // harga display: min harga varian aktif jika multi
  let displayPrice = price;
  let displayCompare = compareAt;
  if (multi) {
    const prices = variants
      .filter((v) => v.is_active)
      .map((v) => {
        const s = stockOf(stocks, v.id);
        return s?.price_override ?? v.base_price;
      });
    displayPrice = Math.min(...prices);
  }

  // foto: default variant → product primary → null
  const defImg =
    def.images?.find((i) => i.is_primary)?.image_url ||
    def.images?.[0]?.image_url ||
    null;
  const productImg =
    (p.images as { image_url: string }[] | undefined)?.[0]?.image_url || null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    unit: def.unit || p.unit,
    price: displayPrice,
    compareAt: displayCompare,
    icon: p.category.icon,
    imageUrl: defImg || productImg || null,
    available,
    maxPerOrder: p.max_qty_per_order,
    inCartQty: cartQtyByVariant.get(def.id) ?? 0,
    soldCount: p.sold_count,
    ratingAvg: p.rating_avg,
    ratingCount: p.rating_count,
    defaultVariantId: def.id,
    variantLabel: multi ? null : def.name === "Standar" ? def.unit : def.name,
    hasMultipleVariants: multi,
  };
}

/** Ambil produk aktif utk hub aktif + status stok + qty di keranjang. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProductCards(
  where: any,
  takeOrOptions: number | LoadOptions = 60
): Promise<ProductCardData[]> {
  const opts: LoadOptions =
    typeof takeOrOptions === "number" ? { take: takeOrOptions } : takeOrOptions;
  const take = opts.take ?? 60;
  const bestOffers = !!opts.bestOffers;

  const hub = await getActiveHub();
  if (!hub) return [];

  const fetchTake = bestOffers ? Math.max(take * 3, 120) : take;

  const [products, cart] = await Promise.all([
    db.product.findMany({
      where: { status: "active", ...where },
      include: {
        category: true,
        images: { where: { is_primary: true, variant_id: null } },
        variants: {
          where: { is_active: true },
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
          include: {
            images: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }], take: 1 },
          },
        },
        hub_stocks: { where: { hub_id: hub.id } },
      },
      orderBy: bestOffers
        ? [{ sold_count: "desc" }, { rating_avg: "desc" }, { created_at: "desc" }]
        : { created_at: "asc" },
      take: fetchTake,
    }),
    getActiveCart(),
  ]);

  const cartQty = new Map<string, number>();
  cart?.items.forEach((i) => cartQty.set(i.variant_id, i.qty));

  let mapped = products
    .map((p) => mapProductCard(p, cartQty))
    .filter((x): x is ProductCardData => !!x);

  if (bestOffers) {
    mapped = mapped
      .map((p) => ({
        p,
        score: bestOfferScore({
          sold_count: p.soldCount ?? 0,
          rating_avg: p.ratingAvg ?? 0,
          rating_count: p.ratingCount ?? 0,
        }),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.p.ratingAvg ?? 0) - (a.p.ratingAvg ?? 0) ||
          (b.p.soldCount ?? 0) - (a.p.soldCount ?? 0)
      )
      .map((x) => x.p)
      .slice(0, take);
  }

  return mapped;
}
