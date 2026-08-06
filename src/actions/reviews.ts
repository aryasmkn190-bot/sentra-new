"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recomputeProductRating } from "@/lib/product-stats";
import { revalidatePath } from "next/cache";

/** Submit ulasan per produk — HANYA jika user sudah beli item di pesanan status completed. */
export async function submitProductReview(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk dulu." };

  const productId = String(formData.get("product_id") || "");
  const orderId = String(formData.get("order_id") || "").trim();
  const rating = parseInt(String(formData.get("rating")), 10);
  const comment = String(formData.get("comment") || "").trim() || null;

  if (!productId) return { error: "Produk tidak valid." };
  if (!orderId) return { error: "Ulasan harus dari pesanan yang sudah selesai." };
  if (!rating || rating < 1 || rating > 5) return { error: "Pilih rating 1–5 bintang." };
  if (comment && comment.length > 1000) return { error: "Ulasan maksimal 1000 karakter." };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });
  if (!product) return { error: "Produk tidak ditemukan." };

  // Wajib: order milik user + completed + item produk ini terpenuhi (bukan oos/refunded)
  const purchased = await db.orderItem.findFirst({
    where: {
      product_id: productId,
      status: { in: ["fulfilled", "substituted"] },
      order: {
        id: orderId,
        user_id: session.sub,
        status: "completed",
      },
    },
    select: { id: true, order_id: true },
  });
  if (!purchased) {
    return { error: "Ulasan hanya untuk produk yang sudah kamu beli & pesanan selesai." };
  }

  const existing = await db.productReview.findFirst({
    where: {
      product_id: productId,
      user_id: session.sub,
      order_id: orderId,
    },
  });

  if (existing) {
    await db.productReview.update({
      where: { id: existing.id },
      data: { rating, comment },
    });
  } else {
    await db.productReview.create({
      data: {
        product_id: productId,
        user_id: session.sub,
        order_id: orderId,
        rating,
        comment,
        is_visible: true,
      },
    });
  }

  await recomputeProductRating(productId);

  revalidatePath(`/produk/${product.slug}`);
  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath("/");
  revalidatePath("/admin/ulasan");
  revalidatePath("/admin/produk");
  return { ok: true };
}

/** Daftar ulasan visible untuk halaman produk. */
export async function getProductReviews(productId: string, take = 20) {
  const reviews = await db.productReview.findMany({
    where: { product_id: productId, is_visible: true },
    orderBy: { created_at: "desc" },
    take,
    include: {
      user: { select: { name: true, phone_number: true } },
    },
  });

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    admin_reply: r.admin_reply,
    replied_at: r.replied_at,
    created_at: r.created_at,
    user_name: r.user.name?.trim() || maskPhone(r.user.phone_number),
  }));
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return "Pembeli";
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

/** Admin: list ulasan dengan search + filter. */
export async function getAdminProductReviews(
  page?: number,
  q?: string,
  visibility?: string
) {
  const session = await getSession("admin");
  if (!session) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const vis = visibility || "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (vis === "visible") where.is_visible = true;
  if (vis === "hidden") where.is_visible = false;
  if (query) {
    where.OR = [
      { comment: { contains: query, mode: "insensitive" } },
      { product: { name: { contains: query, mode: "insensitive" } } },
      { user: { name: { contains: query, mode: "insensitive" } } },
      { user: { phone_number: { contains: query } } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    db.productReview.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, slug: true } },
        user: { select: { id: true, name: true, phone_number: true } },
      },
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.productReview.count({ where }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      is_visible: r.is_visible,
      admin_reply: r.admin_reply,
      replied_at: r.replied_at,
      created_at: r.created_at.toISOString(),
      product: r.product,
      user: {
        id: r.user.id,
        name: r.user.name,
        phone_number: r.user.phone_number,
      },
    })),
    totalItems,
    currentPage,
  };
}

export async function toggleProductReviewVisibility(id: string) {
  const session = await getSession("admin");
  if (!session) return { error: "Unauthorized" };

  const review = await db.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review) return { error: "Ulasan tidak ditemukan." };

  await db.productReview.update({
    where: { id },
    data: { is_visible: !review.is_visible },
  });
  await recomputeProductRating(review.product_id);

  revalidatePath("/admin/ulasan");
  revalidatePath(`/produk/${review.product.slug}`);
  revalidatePath("/");
  return { ok: true, is_visible: !review.is_visible };
}

export async function replyProductReview(_prev: unknown, formData: FormData) {
  const session = await getSession("admin");
  if (!session) return { error: "Unauthorized" };

  const id = String(formData.get("id") || "");
  const reply = String(formData.get("admin_reply") || "").trim();
  if (!id) return { error: "ID tidak valid." };
  if (reply.length > 1000) return { error: "Balasan maksimal 1000 karakter." };

  const review = await db.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review) return { error: "Ulasan tidak ditemukan." };

  await db.productReview.update({
    where: { id },
    data: {
      admin_reply: reply || null,
      replied_at: reply ? new Date() : null,
    },
  });

  revalidatePath("/admin/ulasan");
  revalidatePath(`/produk/${review.product.slug}`);
  return { ok: true };
}

export async function deleteProductReview(id: string) {
  const session = await getSession("admin");
  if (!session) return { error: "Unauthorized" };

  const review = await db.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review) return { error: "Ulasan tidak ditemukan." };

  await db.productReview.delete({ where: { id } });
  await recomputeProductRating(review.product_id);

  revalidatePath("/admin/ulasan");
  revalidatePath(`/produk/${review.product.slug}`);
  revalidatePath("/");
  return { ok: true };
}
