"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type AnnouncementData = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_url: string | null;
  is_active: boolean;
  created_at: Date;
};

async function requireAdmin() {
  const session = await getSession("admin");
  if (!session) return null;
  return db.adminUser.findFirst({ where: { id: session.sub, status: "active" } });
}

async function requireUser() {
  const session = await getSession("user");
  if (!session) return null;
  return session.sub; // user id
}

export async function createAnnouncement(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi admin berakhir. Masuk kembali." };

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const type = String(formData.get("type") || "info");
  const targetUrl = String(formData.get("target_url") || "").trim() || null;

  if (!title || !body) return { error: "Judul dan isi wajib diisi." };

  await db.announcement.create({
    data: { title, body, type, target_url: targetUrl },
  });

  revalidatePath("/");
  revalidatePath("/admin/announcement");
  return { ok: true };
}

export async function updateAnnouncement(id: string, _prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi admin berakhir. Masuk kembali." };

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const type = String(formData.get("type") || "info");
  const targetUrl = String(formData.get("target_url") || "").trim() || null;
  const isActive = formData.get("is_active") === "true";

  if (!title || !body) return { error: "Judul dan isi wajib diisi." };

  await db.announcement.update({
    where: { id },
    data: { title, body, type, target_url: targetUrl, is_active: isActive },
  });

  revalidatePath("/");
  revalidatePath("/admin/announcement");
  return { ok: true };
}

export async function deleteAnnouncement(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sesi admin berakhir." };

  await db.announcement.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/admin/announcement");
  return { ok: true };
}

export async function getAnnouncements(q?: string, status?: string, page?: number) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const PER_PAGE = 20;
  const currentPage = Math.max(1, page || 1);
  const query = (q || "").trim();
  const statusFilter = status || "all";

  const where: any = {};
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { body: { contains: query, mode: "insensitive" } },
    ];
  }
  if (statusFilter === "active") where.is_active = true;
  if (statusFilter === "inactive") where.is_active = false;

  const [items, totalItems] = await Promise.all([
    db.announcement.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.announcement.count({ where }),
  ]);

  return { items, totalItems, currentPage };
}

export type UserNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_url: string | null;
  created_at: Date;
  is_read: boolean;
};

export async function getUserNotifications() {
  const userId = await requireUser();
  if (!userId) return { items: [] as UserNotification[], unreadCount: 0 };

  const announcements = await db.announcement.findMany({
    where: { is_active: true },
    orderBy: { created_at: "desc" },
    take: 50,
    include: {
      reads: { where: { user_id: userId }, select: { user_id: true } },
    },
  });

  const items: UserNotification[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    type: a.type,
    target_url: a.target_url,
    created_at: a.created_at,
    is_read: a.reads.length > 0,
  }));

  return {
    items,
    unreadCount: items.filter((i) => !i.is_read).length,
  };
}

export async function markAnnouncementAsRead(id: string) {
  const userId = await requireUser();
  if (!userId) return { error: "Silakan masuk terlebih dahulu." };

  try {
    await db.userAnnouncementRead.upsert({
      where: {
        user_id_announcement_id: {
          user_id: userId,
          announcement_id: id,
        },
      },
      create: { user_id: userId, announcement_id: id },
      update: {},
    });
  } catch (err) {
    console.error(err);
  }

  revalidatePath("/notifikasi");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllAnnouncementsAsRead() {
  const userId = await requireUser();
  if (!userId) return { error: "Silakan masuk terlebih dahulu." };

  const unreadAnnouncements = await db.announcement.findMany({
    where: {
      is_active: true,
      reads: {
        none: { user_id: userId },
      },
    },
  });

  await db.$transaction(
    unreadAnnouncements.map((a) =>
      db.userAnnouncementRead.upsert({
        where: {
          user_id_announcement_id: {
            user_id: userId,
            announcement_id: a.id,
          },
        },
        create: { user_id: userId, announcement_id: a.id },
        update: {},
      })
    )
  );

  revalidatePath("/notifikasi");
  revalidatePath("/", "layout");
  return { ok: true };
}
