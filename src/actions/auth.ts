"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { issueOtp, checkOtp } from "@/lib/otp";
import { createSession, destroySession, getSession } from "@/lib/session";

const PHONE_RE = /^08\d{8,12}$/;

export type AuthState = {
  step: "phone" | "otp";
  phone?: string;
  error?: string;
  devCode?: string;
} | null;

export async function requestUserOtp(_prev: unknown, formData: FormData): Promise<AuthState> {
  const phone = String(formData.get("phone") || "").replace(/\D/g, "");
  if (!PHONE_RE.test(phone)) return { step: "phone", error: "Format nomor tidak valid. Contoh: 081234567890" };
  const res = await issueOtp(phone, "user");
  if (!res.ok) return { step: "phone", error: res.error };
  return { step: "otp", phone, devCode: res.devCode };
}

export async function verifyUserOtp(_prev: unknown, formData: FormData): Promise<AuthState> {
  const phone = String(formData.get("phone") || "");
  const code = String(formData.get("code") || "").trim();
  const next = String(formData.get("next") || "/");

  const res = await checkOtp(phone, "user", code);
  if (!res.ok) return { step: "otp", phone, error: res.error };

  let user = await db.user.findUnique({ where: { phone_number: phone } });
  if (user?.status === "blocked") return { step: "otp", phone, error: "Akun diblokir. Hubungi CS." };
  if (!user) {
    user = await db.user.create({
      data: {
        phone_number: phone,
        referral_code: "KM" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      },
    });
  }

  // Merge keranjang guest → keranjang user (FR-5.2)
  const jar = await cookies();
  const guestToken = jar.get("km_cart")?.value;
  if (guestToken) {
    const guestCart = await db.cart.findFirst({
      where: { session_token: guestToken, status: "active" },
      include: { items: true },
    });
    if (guestCart) {
      const userCart = await db.cart.findFirst({ where: { user_id: user.id, status: "active" } });
      if (!userCart) {
        await db.cart.update({
          where: { id: guestCart.id },
          data: { user_id: user.id, session_token: null },
        });
      } else {
        for (const item of guestCart.items) {
          await db.cartItem.upsert({
            where: { cart_id_variant_id: { cart_id: userCart.id, variant_id: item.variant_id } },
            update: { qty: { increment: item.qty } },
            create: {
              cart_id: userCart.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              qty: item.qty,
            },
          });
        }
        await db.cart.update({ where: { id: guestCart.id }, data: { status: "abandoned" } });
      }
    }
    jar.delete("km_cart");
  }

  await createSession("user", user.id);
  redirect(next);
}

export async function updateUserProfile(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession("user");
  if (!session) return { ok: false, error: "Sesi habis. Silakan masuk lagi." };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const dobRaw = String(formData.get("date_of_birth") || "").trim();
  // Parse date-only (YYYY-MM-DD) sebagai UTC midnight agar tidak geser hari
  let date_of_birth: Date | null = null;
  if (dobRaw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobRaw);
    if (!m) return { ok: false, error: "Format tanggal lahir tidak valid." };
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      return { ok: false, error: "Tanggal lahir tidak valid." };
    }
    const now = new Date();
    if (y < 1940 || dt.getTime() > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
      return { ok: false, error: "Tanggal lahir di luar rentang yang diizinkan." };
    }
    date_of_birth = dt;
  }
  const preferredDropPointId = String(formData.get("preferred_drop_point_id") || "").trim() || null;

  if (!name) return { ok: false, error: "Nama tidak boleh kosong." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Format email tidak valid." };

  if (preferredDropPointId) {
    const dropPoint = await db.dropPoint.findFirst({
      where: { id: preferredDropPointId, is_active: true },
      select: { id: true },
    });
    if (!dropPoint) return { ok: false, error: "Drop point tidak valid atau tidak aktif." };
  }

  await db.user.update({
    where: { id: session.sub },
    data: {
      name,
      email,
      date_of_birth,
      preferred_drop_point_id: preferredDropPointId,
    },
  });

  return { ok: true };
}

export async function logoutUser() {
  await destroySession("user");
  redirect("/");
}

export async function requestPartnerOtp(_prev: unknown, formData: FormData): Promise<AuthState> {
  const phone = String(formData.get("phone") || "").replace(/\D/g, "");
  const partner = await db.partner.findUnique({ where: { phone } });
  if (!partner || partner.status !== "active")
    return { step: "phone", error: "Nomor tidak terdaftar sebagai mitra aktif." };
  const res = await issueOtp(phone, "partner");
  if (!res.ok) return { step: "phone", error: res.error };
  return { step: "otp", phone, devCode: res.devCode };
}

export async function verifyPartnerOtp(_prev: unknown, formData: FormData): Promise<AuthState> {
  const phone = String(formData.get("phone") || "");
  const code = String(formData.get("code") || "").trim();
  const res = await checkOtp(phone, "partner", code);
  if (!res.ok) return { step: "otp", phone, error: res.error };
  const partner = await db.partner.findUnique({ where: { phone } });
  if (!partner) return { step: "phone", error: "Mitra tidak ditemukan." };
  await createSession("partner", partner.id);
  redirect(partner.role === "picker" ? "/partner/picker" : "/partner/driver");
}

export async function logoutPartner() {
  await destroySession("partner");
  redirect("/partner/login");
}
