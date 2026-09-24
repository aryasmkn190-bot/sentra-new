"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveCart } from "@/lib/storefront";
import {
  voucherRestrictionError,
  voucherDiscount,
  formatRestriction,
} from "@/lib/vouchers";
import { revalidatePath } from "next/cache";

/** Klaim voucher utk user yang login. */
export async function claimVoucher(voucherId: string) {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk dulu." };

  const now = new Date();
  const voucher = await db.voucher.findUnique({
    where: { id: voucherId },
    include: {
      usages: true,
      claims: { where: { user_id: session.sub } },
    },
  });
  if (!voucher || !voucher.is_active) return { error: "Voucher tidak ditemukan." };
  if (now < voucher.start_at || now > voucher.end_at)
    return { error: "Voucher sudah tidak berlaku." };
  if (voucher.claims.length > 0) return { error: "Kamu sudah mengklaim voucher ini." };
  if (voucher.usages.length >= voucher.quota_total)
    return { error: "Kuota voucher sudah habis." };

  try {
    await db.claimedVoucher.create({
      data: { user_id: session.sub, voucher_id: voucher.id },
    });
  } catch {
    return { error: "Kamu sudah mengklaim voucher ini." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/akun/voucher");
  return { ok: true };
}

/** Voucher milik user (halaman /akun/voucher). */
export async function getMyVouchers() {
  const session = await getSession("user");
  if (!session) return null;

  const claims = await db.claimedVoucher.findMany({
    where: { user_id: session.sub },
    include: { voucher: true },
    orderBy: { claimed_at: "desc" },
  });

  const now = Date.now();
  return claims.map((c) => {
    const v = c.voucher;
    const expired =
      c.status !== "used" &&
      (now < v.start_at.getTime() || now > v.end_at.getTime());
    return {
      ...c,
      effectiveStatus: c.status === "used" ? "used" : expired ? "expired" : "claimed",
      restriction: formatRestriction(v),
    };
  });
}

/** Voucher klaim yang valid utk keranjang saat ini (dropdown checkout). */
export async function getCheckoutVouchers(subtotal: number) {
  const session = await getSession("user");
  if (!session) return { items: [] };

  const cart = await getActiveCart();
  const productIds = cart?.items.filter((i) => i.product_id).map((i) => i.product_id!) ?? [];
  const bundleIds = cart?.items.filter((i) => i.bundle_id).map((i) => i.bundle_id!) ?? [];
  const bundleSubtotal =
    cart?.items
      .filter((i) => i.bundle)
      .reduce((sum, i) => sum + (i.bundle?.price || 0) * i.qty, 0) ?? 0;

  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category_id: true },
      })
    : [];
  const categoryIds = [...new Set(products.map((p) => p.category_id))];

  const claims = await db.claimedVoucher.findMany({
    where: { user_id: session.sub, status: "claimed" },
    include: { voucher: true },
  });

  const now = new Date();
  const items: any[] = [];
  for (const c of claims) {
    const v = c.voucher;
    if (!v.is_active || now < v.start_at || now > v.end_at) continue;
    if (subtotal < v.min_order_amount) continue;
    const restr = voucherRestrictionError(v, {
      cartProductIds: productIds,
      cartCategoryIds: categoryIds,
      cartBundleIds: bundleIds,
      cartBundleSubtotal: bundleSubtotal,
      now,
    });
    if (restr) continue;
    const discount = voucherDiscount(v, subtotal, bundleSubtotal);
    if (discount <= 0 && v.type !== "free_delivery") continue;
    items.push({
      claimId: c.id,
      voucherId: v.id,
      code: v.code,
      name: v.name,
      type: v.type,
      value: v.value,
      max_discount: v.max_discount,
      discount,
      min_order_amount: v.min_order_amount,
      restriction: formatRestriction(v),
    });
  }
  items.sort((a, b) => b.discount - a.discount);
  return { items };
}
