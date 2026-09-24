import { redirect } from "next/navigation";
import { getAdminBatchData } from "@/actions/batch";
import { BatchSettingForm } from "./BatchSettingForm";

export const metadata = {
  title: "Sistem Batch Pembelian",
};

export default async function AdminBatchPage() {
  const data = await getAdminBatchData();
  if (!data) redirect("/admin/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Sistem Batch Pembelian</h1>
        <p className="text-xs text-slate-500">
          Atur jadwal buka-tutup pesanan online Sentra New. Produk Order Langsung tetap bisa dipesan kapan saja.
        </p>
      </div>

      <BatchSettingForm
        batch={data.batch}
        evaluation={data.evaluation}
        orderStats={data.orderStats}
      />
    </div>
  );
}
