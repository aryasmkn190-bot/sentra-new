import Link from "next/link";
import { Price } from "./Price";
import { QtyControl } from "./QtyControl";
import { formatSoldCount } from "@/lib/product-stats";

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
  soldCount?: number;
  ratingAvg?: number;
  ratingCount?: number;
  /** Varian default untuk quick-add di kartu. */
  defaultVariantId: string;
  variantLabel?: string | null;
  hasMultipleVariants?: boolean;
};

function Stars({ avg }: { avg: number }) {
  const full = Math.round(avg);
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600" aria-label={`Rating ${avg.toFixed(1)}`}>
      <span aria-hidden>⭐</span>
      <span className="tabular-nums">{avg > 0 ? avg.toFixed(1) : "–"}</span>
      <span className="sr-only">{full} dari 5</span>
    </span>
  );
}

export function ProductCard({ p, badge }: { p: ProductCardData; badge?: string }) {
  const discount = p.compareAt ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
  const sold = p.soldCount ?? 0;
  const ratingCount = p.ratingCount ?? 0;
  const ratingAvg = p.ratingAvg ?? 0;
  const multi = !!p.hasMultipleVariants;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {badge && (
        <span className="absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-2xl bg-[#A00000] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
          {badge}
        </span>
      )}
      <Link href={`/produk/${p.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#FDF0F0]">
              <span className="text-5xl" aria-hidden>
                {p.icon}
              </span>
            </div>
          )}
          {discount > 0 && (
            <span className="absolute right-2 top-2 z-10 rounded-md bg-[#A00000] px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {p.available > 0 && p.available <= 5 && (
            <span className="absolute bottom-2 left-2 z-10 rounded-md bg-[#FFD54A] px-1.5 py-0.5 text-[10px] font-bold text-[#1A0505] shadow-sm">
              Sisa {p.available}
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/produk/${p.slug}`} className="block">
          <p className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-tight text-slate-900">{p.name}</p>
          <p className="mb-1 text-[11px] text-slate-400">
            {multi ? (
              <>
                dari <span className="font-semibold text-slate-500">{p.variantLabel || p.unit}</span>
              </>
            ) : (
              <>per {p.variantLabel || p.unit}</>
            )}
          </p>
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            {ratingCount > 0 ? (
              <Stars avg={ratingAvg} />
            ) : (
              <span className="text-slate-400">Belum ada rating</span>
            )}
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">Terjual {formatSoldCount(sold)}</span>
          </div>
          <Price amount={p.price} compareAt={p.compareAt} size="sm" />
        </Link>
        <div className="mt-2">
          {multi ? (
            <Link
              href={`/produk/${p.slug}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#A00000]/30 bg-[#FDF0F0] px-3 py-1.5 text-xs font-bold text-[#A00000]"
            >
              Pilih varian
            </Link>
          ) : (
            <QtyControl
              variantId={p.defaultVariantId}
              initialQty={p.inCartQty}
              maxQty={Math.min(p.available, p.maxPerOrder)}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
