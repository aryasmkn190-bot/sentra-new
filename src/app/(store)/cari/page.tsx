import { loadProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const metadata = { title: "Cari Produk" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const cards = query
    ? await loadProductCards({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      })
    : [];

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-lg font-extrabold">{query ? `Hasil untuk "${query}"` : "Cari Produk"}</h1>
      {!query ? (
        <p className="kartu p-6 text-center text-sm text-tinta/60">Ketik kata kunci di kolom pencarian di atas — misal "susu" atau "galon".</p>
      ) : cards.length === 0 ? (
        <p className="kartu p-6 text-center text-sm text-tinta/60">
          Tidak ada hasil untuk "{query}". Coba kata kunci lain yang lebih umum.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
