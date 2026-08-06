import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMyDirectOrder } from "@/actions/direct-order";
import { publicAppOrigin } from "@/lib/direct-order";
import { DIRECT_STATUS_LABEL } from "@/lib/direct-status";
import { getPaymentUrl } from "@/lib/pakasir";
import { rupiah } from "@/lib/money";
import { getSession } from "@/lib/session";

export default async function DirectOrderDonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession("user");
  if (!session) redirect(`/masuk?next=/order-langsung/selesai/${id}`);

  const order = await getMyDirectOrder(id);
  if (!order) notFound();

  const payAgain =
    order.status === "pending_payment" && order.payment?.status === "pending"
      ? getPaymentUrl(
          order.order_number,
          order.total_amount,
          `${publicAppOrigin()}/order-langsung/selesai/${order.id}`
        )
      : null;

  const done = order.status === "completed";

  return (
    <div className="space-y-4 px-4 pt-4 pb-28">
      <div
        className={`kartu p-5 text-center ${
          done ? "border border-emerald-200 bg-emerald-50" : "bg-white"
        }`}
      >
        <p className="text-4xl" aria-hidden>
          {done ? "✅" : order.status === "pending_payment" ? "⏳" : "ℹ️"}
        </p>
        <h1 className="mt-2 text-lg font-extrabold">
          {done ? "Pembayaran berhasil" : DIRECT_STATUS_LABEL[order.status] || order.status}
        </h1>
        <p className="mt-1 font-mono text-sm font-bold text-slate-700">{order.order_number}</p>
        {done && (
          <p className="mt-2 text-sm font-semibold text-emerald-800">
            Tunjukkan layar ini ke petugas gudang untuk mengambil barang.
          </p>
        )}
      </div>

      <section className="kartu divide-y divide-black/5">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between p-4 text-sm">
            <span>
              {i.product_name_snapshot} × {i.qty}
            </span>
            <span className="tabular-nums font-semibold">{rupiah(i.subtotal)}</span>
          </div>
        ))}
        <div className="flex justify-between p-4 text-base font-extrabold">
          <span>Total</span>
          <span className="tabular-nums text-[#A00000]">{rupiah(order.total_amount)}</span>
        </div>
      </section>

      {payAgain && (
        <a href={payAgain} className="btn-utama block w-full text-center">
          Lanjut bayar
        </a>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/order-langsung" className="btn-garis block w-full text-center">
          Scan produk lain
        </Link>
        <Link href="/" className="text-center text-xs font-bold text-slate-500">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
