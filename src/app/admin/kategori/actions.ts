"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveCategory(_prev: unknown, formData: FormData) {
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const icon = formData.get("icon") as string;
  const image_url = formData.get("image_url") as string || null;
  const sort_order = parseInt(formData.get("sort_order") as string || "0", 10);
  const is_active = formData.get("is_active") === "true";

  if (id) {
    await db.category.update({
      where: { id },
      data: { name, slug, icon, image_url, sort_order, is_active }
    });
  } else {
    await db.category.create({
      data: { name, slug, icon, image_url, sort_order, is_active }
    });
  }

  revalidatePath("/");
  revalidatePath("/kategori");
  revalidatePath("/admin/kategori");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  await db.category.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/kategori");
  revalidatePath("/admin/kategori");
}

export async function getCategoryList(page?: number, q?: string, status?: string) {
  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
    ];
  }
  if (statusFilter === "active") where.is_active = true;
  if (statusFilter === "inactive") where.is_active = false;

  const [items, totalItems] = await Promise.all([
    db.category.findMany({
      where,
      orderBy: { sort_order: "asc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.category.count({ where }),
  ]);
  return { items, totalItems, currentPage };
}
