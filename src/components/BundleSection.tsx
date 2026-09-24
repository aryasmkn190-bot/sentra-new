import { rupiah } from "@/lib/money";
import { BundleQtyControl } from "./BundleQtyControl";
import type { BundleDetail } from "@/actions/bundle";

export function BundleSection({ bundles }: { bundles: BundleDetail[] }) {
  if (!bundles || bundles.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base" aria-hidden>
              📦
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
              Paket Bundling Hemat
            </h2>
          </div>
          <p className="text-[11px] text-slate-500">
            Pilih paket hemat, otomatis masuk keranjang tanpa repot satu-satu.
          </p>
        </div>
        {bundles.length > 1 && (
          <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Geser →
          </span>
        )}
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-0.5 scrollbar-none snap-x snap-mandatory">
        {bundles.map((bundle) => {
          const discount = bundle.compare_at_price
            ? Math.round(
                ((bundle.compare_at_price - bundle.price) / bundle.compare_at_price) * 100
              )
            : 0;

          return (
            <div
              key={bundle.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 ${
                bundles.length > 1
                  ? "w-[85%] min-w-[280px] max-w-[360px] shrink-0 snap-start"
                  : "w-full"
              }`}
            >
              <div>
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-amber-50 flex items-center justify-center border border-black/5">
                    {bundle.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bundle.image_url}
                        alt={bundle.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl" aria-hidden>
                        📦
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="absolute left-1 top-1 rounded bg-[#A00000] px-1 py-0.2 text-[9px] font-extrabold text-white">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 uppercase">
                        Paket Hemat
                      </span>
                      <span className="text-[10px] text-slate-400">
                        · Stok:{" "}
                        <b className={bundle.availableStock > 0 ? "text-emerald-700" : "text-merah"}>
                          {bundle.availableStock > 0 ? `${bundle.availableStock} paket` : "Habis"}
                        </b>
                      </span>
                    </div>

                    <h3 className="mt-1 text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                      {bundle.name}
                    </h3>

                    {bundle.description && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                        {bundle.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Isi Produk dalam paket */}
                <div className="mt-3 space-y-0.5 rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-600 border border-slate-100">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Isi Paket:</p>
                  {bundle.items.map((item) => (
                    <p key={item.id} className="truncate">
                      • {item.product_name} <b className="text-slate-900">({item.qty} pcs)</b>
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Harga Paket</p>
                  <p className="text-base font-extrabold tabular-nums text-[#A00000]">
                    {rupiah(bundle.price)}
                  </p>
                  {bundle.compare_at_price && (
                    <p className="text-[10px] text-slate-400 line-through tabular-nums">
                      {rupiah(bundle.compare_at_price)}
                    </p>
                  )}
                </div>

                <div className="w-32">
                  <BundleQtyControl
                    bundleId={bundle.id}
                    initialQty={0}
                    maxQty={bundle.availableStock}
                    compact
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
