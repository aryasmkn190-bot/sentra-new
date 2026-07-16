import Link from "next/link";
import { Price } from "./Price";
import { QtyControl } from "./QtyControl";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  price: number;
  compareAt: number | null;
  icon: string;
  imageUrl?: string | null;
  available: number;
  maxPerOrder: number;
  inCartQty: number;
};

export function ProductCard({ p, badge }: { p: ProductCardData; badge?: string }) {
  const discount = p.compareAt ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
  return (
    // wireframe: card radius=16, elevation=1
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      {badge && (
        // wireframe: badge topLeft=16, bottomRight=12
        <span className="absolute left-0 top-0 z-10 rounded-tl-2xl rounded-br-xl bg-merah px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
          {badge}
        </span>
      )}
      <Link href={`/produk/${p.slug}`} className="block">
        {/* wireframe: image width=100%, height=112, radius=12 */}
        <div className="relative aspect-square overflow-hidden">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hijau-muda">
              <span className="text-5xl" aria-hidden>{p.icon}</span>
            </div>
          )}
          {/* wireframe: badge top-left */}
          {discount > 0 && (
            <span className="absolute right-2 top-2 z-10 rounded-md bg-merah px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {p.available > 0 && p.available <= 5 && (
            <span className="absolute bottom-2 left-2 z-10 rounded-md bg-kilat px-1.5 py-0.5 text-[10px] font-bold text-tinta shadow-sm">
              Sisa {p.available}
            </span>
          )}
        </div>
      </Link>
      {/* wireframe: card-info padding left=4 right=4 */}
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/produk/${p.slug}`} className="block">
          {/* wireframe: product-name variant */}
          <p className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-tight text-tinta">{p.name}</p>
          <p className="mb-1 text-[11px] text-tinta/50">per {p.unit}</p>
          {/* wireframe: price variant */}
          <Price amount={p.price} compareAt={p.compareAt} size="sm" />
        </Link>
        <div className="mt-2">
          <QtyControl productId={p.id} initialQty={p.inCartQty} maxQty={Math.min(p.available, p.maxPerOrder)} compact />
        </div>
      </div>
    </div>
  );
}