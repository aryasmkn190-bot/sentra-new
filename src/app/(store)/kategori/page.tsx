import Link from "next/link";
import { db } from "@/lib/db";
import { CategoryImage } from "@/components/CategoryImage";

export const metadata = { title: "Semua Kategori" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    where: { is_active: true, parent_id: null },
    orderBy: { sort_order: "asc" },
  });
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-lg font-extrabold">Semua Kategori</h1>
      <div className="grid grid-cols-3 gap-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/kategori/${c.slug}`} className="kartu flex flex-col items-center gap-2 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-full aspect-square overflow-hidden rounded-lg mb-1">
               <CategoryImage slug={c.slug} image_url={c.image_url} alt={c.name} />
            </div>
            <span className="text-xs font-bold leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
