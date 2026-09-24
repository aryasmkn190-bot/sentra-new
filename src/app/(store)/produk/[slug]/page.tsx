import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveHub, getActiveCart } from "@/lib/storefront";
import { loadProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { getProductReviews } from "@/actions/reviews";
import { formatSoldCount } from "@/lib/product-stats";
import { getSession } from "@/lib/session";
import { ProductReviewForm } from "@/components/ProductReviewForm";
import { ProductBuyBox } from "@/components/ProductBuyBox";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: {
        where: { variant_id: null },
        orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
      },
      variants: {
        where: { is_active: true },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: {
          images: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }] },
        },
      },
    },
  });
  if (!product || product.status !== "active") notFound();

  const hub = await getActiveHub();
  const stocks = hub
    ? await db.hubStock.findMany({
        where: { hub_id: hub.id, product_id: product.id },
      })
    : [];

  const cart = await getActiveCart();
  const cartQty = new Map<string, number>();
  cart?.items.forEach((i) => {
    if (i.variant_id) cartQty.set(i.variant_id, i.qty);
  });

  const storeVariants = product.variants.map((v) => {
    const stock = stocks.find((s) => s.variant_id === v.id);
    const available = stock ? Math.max(stock.stock_qty - stock.reserved_qty, 0) : 0;
    return {
      id: v.id,
      name: v.name,
      unit: v.unit,
      price: stock?.price_override ?? v.base_price,
      compareAt: v.compare_at_price,
      available,
      inCartQty: cartQty.get(v.id) ?? 0,
      isDefault: v.is_default,
      images: v.images.map((img) => img.image_url),
    };
  });

  const fallbackImage =
    product.images[0]?.image_url ||
    storeVariants.find((v) => v.isDefault)?.images?.[0] ||
    storeVariants[0]?.images?.[0] ||
    null;

  const [similar, reviews, session] = await Promise.all([
    loadProductCards({ category_id: product.category_id, id: { not: product.id } }, 4),
    getProductReviews(product.id, 20),
    getSession("user"),
  ]);

  let canReview = false;
  let reviewOrderId: string | undefined;
  if (session) {
    const purchased = await db.orderItem.findFirst({
      where: {
        product_id: product.id,
        status: { in: ["fulfilled", "substituted"] },
        order: { user_id: session.sub, status: "completed" },
      },
      orderBy: { order: { completed_at: "desc" } },
      select: { order_id: true },
    });
    if (purchased) {
      const existing = await db.productReview.findFirst({
        where: {
          product_id: product.id,
          user_id: session.sub,
          order_id: purchased.order_id,
        },
      });
      if (!existing) {
        canReview = true;
        reviewOrderId = purchased.order_id;
      }
    }
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="kartu overflow-hidden">
        <div className="space-y-3 p-4">
          <ProductBuyBox
            productName={product.name}
            maxPerOrder={product.max_qty_per_order}
            variants={storeVariants}
            fallbackImage={fallbackImage}
            categoryIcon={product.category.icon}
          />

          <div>
            <h1 className="text-lg font-extrabold leading-snug">{product.name}</h1>
            <p className="text-xs text-tinta/50">
              {product.category.name}
              {storeVariants.length > 1
                ? ` · ${storeVariants.length} varian`
                : ` · ${storeVariants[0]?.unit || product.unit}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700 ring-1 ring-amber-100">
              ⭐ {product.rating_count > 0 ? product.rating_avg.toFixed(1) : "–"}
              <span className="font-semibold text-amber-600/80">({product.rating_count} ulasan)</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-600 ring-1 ring-black/5">
              Terjual {formatSoldCount(product.sold_count)}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-tinta/70">{product.description}</p>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-extrabold">Ulasan Pembeli</h2>
            <p className="text-[11px] text-slate-500">
              {product.rating_count > 0
                ? `Rata-rata ${product.rating_avg.toFixed(1)} dari ${product.rating_count} ulasan`
                : "Belum ada ulasan untuk produk ini"}
            </p>
          </div>
        </div>

        {canReview && reviewOrderId ? (
          <div className="kartu p-4">
            <p className="mb-2 text-[11px] font-semibold text-slate-500">
              Kamu sudah membeli produk ini — bagikan penilaianmu
            </p>
            <ProductReviewForm productId={product.id} orderId={reviewOrderId} productName={product.name} />
          </div>
        ) : session ? (
          <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
            Rating & ulasan hanya untuk pembeli yang pesanannya sudah <b>selesai</b>. Setelah pesanan selesai, beri
            ulasan di halaman pesanan atau di sini.
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
            <a href={`/masuk?next=/produk/${product.slug}`} className="font-bold text-[#A00000]">
              Masuk
            </a>{" "}
            setelah membeli & pesanan selesai untuk memberi ulasan.
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="kartu p-6 text-center text-sm text-slate-400">Belum ada ulasan.</div>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="kartu p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.user_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(r.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                {r.admin_reply && (
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-black/5">
                    <p className="font-extrabold text-slate-700">Balasan toko</p>
                    <p className="mt-0.5">{r.admin_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {similar.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-base font-extrabold">Produk Serupa</h2>
          <div className="grid grid-cols-2 gap-3">
            {similar.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
