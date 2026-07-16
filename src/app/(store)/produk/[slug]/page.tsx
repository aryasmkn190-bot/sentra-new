import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveHub, getActiveCart } from "@/lib/storefront";
import { loadProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Price } from "@/components/Price";
import { QtyControl } from "@/components/QtyControl";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true, images: { where: { is_primary: true } } },
  });
  if (!product || product.status !== "active") notFound();

  const hub = await getActiveHub();
  const stock = hub
    ? await db.hubStock.findUnique({
        where: { hub_id_product_id: { hub_id: hub.id, product_id: product.id } },
      })
    : null;
  const available = stock ? Math.max(stock.stock_qty - stock.reserved_qty, 0) : 0;
  const price = stock?.price_override ?? product.base_price;

  const cart = await getActiveCart();
  const inCart = cart?.items.find((i) => i.product_id === product.id)?.qty ?? 0;

  const similar = (await loadProductCards({ category_id: product.category_id, id: { not: product.id } }, 4));

  return (
    <div className="px-4 pt-4">
      <div className="kartu overflow-hidden">
        <div className="flex aspect-square items-center justify-center bg-hijau-muda">
          {product.images[0]?.image_url ? (
            <img src={product.images[0].image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-8xl" aria-hidden>{product.category.icon}</span>
          )}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h1 className="text-lg font-extrabold leading-snug">{product.name}</h1>
            <p className="text-xs text-tinta/50">per {product.unit} · {product.category.name}</p>
          </div>
          <Price amount={price} compareAt={product.compare_at_price} size="lg" />
          {available === 0 ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-merah">Stok habis di hub kamu</p>
          ) : available <= 5 ? (
            <p className="rounded-xl bg-kilat/30 px-3 py-2 text-xs font-bold">Stok terbatas — sisa {available}</p>
          ) : null}
          <p className="text-sm leading-relaxed text-tinta/70">{product.description}</p>
          <QtyControl productId={product.id} initialQty={inCart} maxQty={Math.min(available, product.max_qty_per_order)} />
          <p className="text-[11px] text-tinta/50">Maks. {product.max_qty_per_order} per pesanan · ⚡ sampai 15–30 menit</p>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base font-extrabold">Produk serupa</h2>
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
