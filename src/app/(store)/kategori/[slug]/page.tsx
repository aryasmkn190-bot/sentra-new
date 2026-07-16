import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { loadProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const cards = await loadProductCards({ category_id: category.id });

  return (
    <div className="px-4 pt-4">
      <div className="mb-3">
        <Link href="/kategori" className="inline-flex items-center gap-1 text-xs font-bold text-hijau hover:underline">
          ← Semua Kategori
        </Link>
      </div>
      <h1 className="mb-3 text-lg font-extrabold">
        <span aria-hidden className="mr-1">{category.icon}</span> {category.name}
      </h1>
      {cards.length === 0 ? (
        <p className="kartu p-6 text-center text-sm text-tinta/60">
          Belum ada produk di kategori ini untuk hub kamu. Cek kategori lain, ya.
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
