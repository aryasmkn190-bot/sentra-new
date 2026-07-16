"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { pointInPolygon } from "@/lib/geo";

/** FR-2.2 — cari zona aktif yang mencakup titik; kembalikan hub-nya. */
export async function findServingZone(lat: number, lng: number) {
  const zones = await db.serviceZone.findMany({ where: { is_active: true }, include: { hub: true } });
  for (const zone of zones) {
    const poly = zone.polygon as [number, number][];
    if (Array.isArray(poly) && pointInPolygon(lat, lng, poly)) return zone;
  }
  return null;
}

export type AddressState = { error?: string; ok?: boolean; addressId?: string; hubName?: string } | null;

export async function saveAddress(_prev: unknown, formData: FormData): Promise<AddressState> {
  const session = await getSession("user");
  if (!session) return { error: "Silakan masuk terlebih dahulu." };

  const lat = parseFloat(String(formData.get("latitude")));
  const lng = parseFloat(String(formData.get("longitude")));
  const data = {
    label: String(formData.get("label") || "rumah"),
    recipient_name: String(formData.get("recipient_name") || "").trim(),
    recipient_phone: String(formData.get("recipient_phone") || "").trim(),
    full_address: String(formData.get("full_address") || "").trim(),
    courier_note: String(formData.get("courier_note") || "") || null,
  };
  if (!data.recipient_name || !data.full_address || isNaN(lat) || isNaN(lng)) {
    return { error: "Nama penerima, alamat lengkap, dan titik lokasi wajib diisi." };
  }

  const zone = await findServingZone(lat, lng);
  if (!zone) {
    // FR-2.2 — di luar area: simpan waiting list sebagai leads ekspansi
    await db.waitingList.create({
      data: { phone: data.recipient_phone || "-", address_text: data.full_address, latitude: lat, longitude: lng },
    });
    return {
      error:
        "Yah, alamat ini belum masuk area layanan. Kami sudah catat sebagai daftar tunggu — kamu akan jadi yang pertama tahu saat kami sampai di sana!",
    };
  }

  const count = await db.address.count({ where: { user_id: session.sub } });
  const address = await db.address.create({
    data: { ...data, user_id: session.sub, latitude: lat, longitude: lng, is_default: count === 0 },
  });

  const jar = await cookies();
  jar.set("km_hub", zone.hub_id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 3600 });
  revalidatePath("/", "layout");
  return { ok: true, addressId: address.id, hubName: zone.hub.name };
}

export async function setDefaultAddress(addressId: string) {
  const session = await getSession("user");
  if (!session) return;
  await db.address.updateMany({ where: { user_id: session.sub }, data: { is_default: false } });
  await db.address.update({ where: { id: addressId }, data: { is_default: true } });
  revalidatePath("/akun");
  revalidatePath("/checkout");
}
