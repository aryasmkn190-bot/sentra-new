import { db } from "@/lib/db";
import { StockAdjustForm } from "./StockAdjustForm";
import { Pagination } from "@/components/Pagination";

export const metadata = { title: "Inventori" };
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 20;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || "1", 10);

  const [stocks, totalItems] = await Promise.all([
    db.hubStock.findMany({
      include: { product: true, hub: true },
      orderBy: [{ hub: { code: "asc" } }, { rack_location: "asc" }],
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    db.hubStock.count(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-slate-800">Inventori per Hub</h1>
      <div className="kartu !shadow-none border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-black/5 text-left font-bold text-slate-500">
              <tr>
                <th className="p-4">Hub</th>
                <th className="p-4">Rak</th>
                <th className="p-4">Produk</th>
                <th className="p-4 text-right">Stok</th>
                <th className="p-4 text-right">Direservasi</th>
                <th className="p-4 text-right">Tersedia</th>
                <th className="p-4">Penyesuaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {stocks.map((s) => {
                const available = s.stock_qty - s.reserved_qty;
                return (
                  <tr key={s.id} className={`${available <= s.low_stock_threshold ? "bg-amber-50/55" : ""} hover:bg-slate-50/50 transition-colors`}>
                    <td className="p-4 font-mono text-slate-500">{s.hub.code}</td>
                    <td className="p-4 font-mono text-slate-500">{s.rack_location || "-"}</td>
                    <td className="p-4 font-semibold text-slate-800">
                      {s.product.name}
                      {available <= s.low_stock_threshold && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                          Stok menipis
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-semibold tabular-nums text-slate-700">{s.stock_qty}</td>
                    <td className="p-4 text-right font-semibold tabular-nums text-slate-400">{s.reserved_qty}</td>
                    <td className="p-4 text-right font-extrabold tabular-nums text-slate-800">{available}</td>
                    <td className="p-4"><StockAdjustForm hubStockId={s.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
      </div>
    </div>
  );
}
