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
          <p className="mb-1 text-4xl" aria-hidden>🛒</p>
          <p className="text-sm font-bold">Keranjang kamu masih kosong</p>
          <p className="mb-4 mt-1 text-xs text-tinta/60">Yuk mulai belanja — sampai dalam hitungan menit.</p>
          <Link href="/" className="btn-utama">Mulai belanja</Link>
        </div>
      </div>
    );
  }

  const stocks = await db.hubStock.findMany({
    where: { hub_id: cart.hub_id, product_id: { in: cart.items.map((i) => i.product_id) } },
  });
  const priceOf = (pid: string, base: number) => stocks.find((s) => s.product_id === pid)?.price_override ?? base;
  const availOf = (pid: string) => {
    const s = stocks.find((x) => x.product_id === pid);
    return s ? Math.max(s.stock_qty - s.reserved_qty, 0) : 0;
  };

  const subtotal = cart.items.reduce((sum, i) => sum + priceOf(i.product_id, i.product.base_price) * i.qty, 0);
  const minOrder = zone?.min_order_amount ?? 0;
  const meetsMin = subtotal >= minOrder;

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-lg font-extrabold">Keranjang</h1>

      <div className="kartu divide-y divide-black/5">
        {cart.items.map((item) => {
          const price = priceOf(item.product_id, item.product.base_price);
          return (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-hijau-muda text-2xl" aria-hidden>
                🛍️
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{item.product.name}</p>
                <Price amount={price * item.qty} size="sm" />
              </div>
              <div className="w-28 shrink-0">
                <QtyControl
                  productId={item.product_id}
                  initialQty={item.qty}
                  maxQty={Math.min(availOf(item.product_id) + item.qty, item.product.max_qty_per_order)}
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

      {/* Sticky checkout bar */}
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
