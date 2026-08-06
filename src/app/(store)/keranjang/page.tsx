import Link from "next/link";
import { getActiveCart, getActiveHub } from "@/lib/storefront";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/money";
import { QtyControl } from "@/components/QtyControl";
import { Price } from "@/components/Price";

export const metadata = { title: "Keranjang" };

export default async function CartPage() {
  const [cart, hub] = await Promise.all([getActiveCart(), getActiveHub()]);
  const zone = hub ? await db.serviceZone.findFirst({ where: { hub_id: hub.id, is_active: true } }) : null;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="px-4 pt-4">
        <h1 className="mb-3 text-lg font-extrabold">Keranjang</h1>
        <div className="kartu p-8 text-center">
          <p className="mb-1 text-4xl" aria-hidden>
            🛒
          </p>
          <p className="text-sm font-bold">Keranjang kamu masih kosong</p>
          <p className="mb-4 mt-1 text-xs text-tinta/60">Yuk mulai belanja — sampai dalam hitungan menit.</p>
          <Link href="/" className="btn-utama">
            Mulai belanja
          </Link>
        </div>
      </div>
    );
  }

  const stocks = await db.hubStock.findMany({
    where: {
      hub_id: cart.hub_id,
      variant_id: { in: cart.items.map((i) => i.variant_id) },
    },
  });
  const priceOf = (variantId: string, base: number) =>
    stocks.find((s) => s.variant_id === variantId)?.price_override ?? base;
  const availOf = (variantId: string) => {
    const s = stocks.find((x) => x.variant_id === variantId);
    return s ? Math.max(s.stock_qty - s.reserved_qty, 0) : 0;
  };

  const subtotal = cart.items.reduce(
    (sum, i) => sum + priceOf(i.variant_id, i.variant.base_price) * i.qty,
    0
  );
  const minOrder = zone?.min_order_amount ?? 0;
  const meetsMin = subtotal >= minOrder;

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-lg font-extrabold">Keranjang</h1>

      <div className="kartu divide-y divide-black/5">
        {cart.items.map((item) => {
          const price = priceOf(item.variant_id, item.variant.base_price);
          const imageUrl =
            item.product.images?.find((img) => img.is_primary)?.image_url ||
            item.product.images?.[0]?.image_url ||
            null;
          const variantLabel =
            item.variant.name && item.variant.name !== "Standar" ? item.variant.name : item.variant.unit;
          return (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <Link
                href={`/produk/${item.product.slug}`}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-hijau-muda"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl" aria-hidden>
                    🛍️
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/produk/${item.product.slug}`} className="line-clamp-1 text-sm font-semibold hover:text-hijau">
                  {item.product.name}
                </Link>
                <p className="text-[11px] font-semibold text-slate-400">{variantLabel}</p>
                <Price amount={price * item.qty} size="sm" />
              </div>
              <div className="w-28 shrink-0">
                <QtyControl
                  variantId={item.variant_id}
                  initialQty={item.qty}
                  maxQty={Math.min(availOf(item.variant_id) + item.qty, item.product.max_qty_per_order)}
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="kartu space-y-1 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-tinta/60">Subtotal</span>
          <span className="font-extrabold tabular-nums">{rupiah(subtotal)}</span>
        </div>
        {!meetsMin && (
          <p className="text-xs font-semibold text-merah">
            Minimal belanja {rupiah(minOrder)} — tambah {rupiah(minOrder - subtotal)} lagi.
          </p>
        )}
      </div>

      <div className="sticky bottom-24 z-10 mx-auto w-full">
        {meetsMin ? (
          <Link href="/checkout" className="btn-utama w-full shadow-lg shadow-brand/30">
            Lanjut ke checkout · {rupiah(subtotal)}
          </Link>
        ) : (
          <Link href="/" className="btn-garis w-full">
            Tambah belanjaan — minimal {rupiah(minOrder)}
          </Link>
        )}
      </div>
    </div>
  );
}
