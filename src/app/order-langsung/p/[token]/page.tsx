import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectProductByToken, getActiveDirectProducts } from "@/actions/direct-order";
import { DirectBuyForm } from "./DirectBuyForm";
import { rupiah } from "@/lib/money";

export default async function DirectProductPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [product, allDirectProducts] = await Promise.all([
    getDirectProductByToken(token),
    getActiveDirectProducts(),
  ]);
  if (!product) notFound();

  const otherProducts = allDirectProducts.filter((p) => p.id !== product.id);

  return (
    <div className="space-y-4 px-4 pt-2 pb-28">
      <Link href="/order-langsung" className="text-xs font-bold text-[#A00000]">
        ← Scan lagi
      </Link>

      <div className="kartu overflow-hidden">
        <div className="flex aspect-square items-center justify-center bg-hijau-muda">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-7xl" aria-hidden>
              📦
            </span>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#A00000]">
            Order Langsung · Hub PTO Bandung
          </p>
          <h1 className="text-lg font-extrabold leading-snug">{product.name}</h1>
          <p className="text-2xl font-extrabold tabular-nums text-[#A00000]">{rupiah(product.price)}</p>
          {product.description && (
            <p className="text-sm leading-relaxed text-tinta/70">{product.description}</p>
          )}
          <p className="text-xs text-slate-500">
            Stok tersedia:{" "}
            <b className={product.available > 0 ? "text-emerald-700" : "text-merah"}>
              {product.available}
            </b>
          </p>
        </div>
      </div>

      {product.available > 0 ? (
        <DirectBuyForm
          currentProduct={product}
          otherProducts={otherProducts}
        />
      ) : (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-merah">Stok habis</div>
      )}
    </div>
  );
}
