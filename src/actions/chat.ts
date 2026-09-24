"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  CHAT_CATEGORIES,
  MAX_CHAT_BODY,
  categoryLabel,
  type ChatCategoryCode,
} from "@/lib/chat";
import { purgeChatImages, saveChatImage, tryDeleteChatImage } from "@/lib/chat-upload";

const PAGE_SIZE = 50;

/**
 * Hapus permanen seluruh riwayat chat + file gambar di disk.
 * Dipakai saat akhiri sesi (user/admin) dan sebelum mulai sesi baru.
 * Urutan: (1) hapus file gambar individu (jika ada), (2) hapus riwayat DB,
 * (3) hapus folder upload thread dari disk, (4) pass kedua DB & disk untuk race condition.
 */
async function wipeChatHistory(threadId: string) {
  try {
    const msgsWithImages = await db.chatMessage.findMany({
      where: { thread_id: threadId, image_url: { not: null } },
      select: { image_url: true },
    });
    for (const m of msgsWithImages) {
      if (m.image_url) {
        await tryDeleteChatImage(m.image_url);
      }
    }
  } catch {
    /* lanjutkan pembersihan folder jika query gagal */
  }

  // 1) Hapus riwayat di DB dulu (termasuk image_url di row pesan)
  const deleted = await db.chatMessage.deleteMany({ where: { thread_id: threadId } });
  // 2) Hapus folder file di filesystem (double-pass di dalam helper)
  const files = await purgeChatImages(threadId);
  // 3) Pass kedua DB — jaga-jaga pesan yang masuk di sela delete+purge
  await db.chatMessage.deleteMany({ where: { thread_id: threadId } });
  await purgeChatImages(threadId);
  return { messagesDeleted: deleted.count, filesRemoved: files.removedFiles };
}

export type ChatMsg = {
  id: string;
  sender_type: "user" | "admin" | "system";
  body: string;
  image_url: string | null;
  created_at: string;
};

export type ChatThreadView = {
  id: string;
  status: string;
  category: string;
  category_detail: string;
  category_label: string;
  admin_joined: boolean;
  admin_joined_at: string | null;
  unread_user: number;
  unread_admin: number;
};

function previewOf(body: string, hasImage: boolean) {
  const t = body.trim().replace(/\s+/g, " ");
  if (!t && hasImage) return "📷 Gambar";
  if (!t) return "";
  const prefix = hasImage ? "📷 " : "";
  const full = prefix + t;
  return full.length > 120 ? full.slice(0, 117) + "…" : full;
}

/** Normalize legacy /uploads/chat/… → /api/chat-media/… (runtime-safe). */
function publicChatImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/chat/")) {
    return "/api/chat-media/" + url.slice("/uploads/chat/".length);
  }
  return url;
}

function mapMsg(m: {
  id: string;
  sender_type: string;
  body: string;
  image_url: string | null;
  created_at: Date;
}): ChatMsg {
  return {
    id: m.id,
    sender_type: m.sender_type as ChatMsg["sender_type"],
    body: m.body,
    image_url: publicChatImageUrl(m.image_url),
    created_at: m.created_at.toISOString(),
  };
}

function mapThread(t: {
  id: string;
  status: string;
  category: string;
  category_detail: string;
  admin_joined: boolean;
  admin_joined_at: Date | null;
  unread_user: number;
  unread_admin: number;
}): ChatThreadView {
  return {
    id: t.id,
    status: t.status,
    category: t.category,
    category_detail: t.category_detail,
    category_label: categoryLabel(t.category),
    admin_joined: t.admin_joined,
    admin_joined_at: t.admin_joined_at?.toISOString() ?? null,
    unread_user: t.unread_user,
    unread_admin: t.unread_admin,
  };
}

async function getOrCreateUserThread(userId: string) {
  return db.chatThread.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      status: "closed",
      category: "",
      category_detail: "",
      admin_joined: false,
    },
    update: {},
  });
}

async function addSystemMessage(threadId: string, body: string) {
  return db.chatMessage.create({
    data: {
      thread_id: threadId,
      sender_type: "system",
      sender_id: "system",
      body,
      image_url: null,
    },
  });
}

// ─── User ────────────────────────────────────────────────

/** User: get own thread + messages. Does NOT auto-open closed sessions. */
export async function getMyChat(afterId?: string | null) {
  const session = await getSession("user");
  if (!session) return { error: "login" as const };

  const thread = await getOrCreateUserThread(session.sub);

  let messages;
  if (afterId) {
    const anchor = await db.chatMessage.findUnique({ where: { id: afterId } });
    messages = await db.chatMessage.findMany({
      where: {
        thread_id: thread.id,
        created_at: { gt: anchor?.created_at ?? new Date(0) },
      },
      orderBy: { created_at: "asc" },
      take: PAGE_SIZE,
    });
  } else {
    messages = await db.chatMessage.findMany({
      where: { thread_id: thread.id },
      orderBy: { created_at: "asc" },
      take: 100,
    });
  }

  if (thread.unread_user > 0 && !afterId) {
    await db.chatThread.update({
      where: { id: thread.id },
      data: { unread_user: 0 },
    });
  }

  return {
    ok: true as const,
    thread: mapThread({
      ...thread,
      unread_user: afterId ? thread.unread_user : 0,
    }),
    messages: messages.map(mapMsg),
    categories: CHAT_CATEGORIES.map((c) => ({ code: c.code, label: c.label })),
  };
}

/** Mulai sesi chat — wajib pilih kategori + detail singkat. */
export async function startChatSession(category: string, detail: string) {
  const session = await getSession("user");
  if (!session) return { error: "login" as const };

  const code = (category || "").trim() as ChatCategoryCode;
  const valid = CHAT_CATEGORIES.some((c) => c.code === code);
  if (!valid) return { error: "Pilih kategori masalah" };

  const note = (detail || "").trim();
  if (note.length < 5) return { error: "Jelaskan masalah minimal 5 karakter" };
  if (note.length > 500) return { error: "Detail maksimal 500 karakter" };

  const thread = await getOrCreateUserThread(session.sub);
  if (thread.status === "open") {
    return { error: "Sesi chat masih aktif. Akhiri dulu bila ingin sesi baru." };
  }

  // Pastikan bersih (jaga-jaga sisa pesan + file dari sesi lama)
  await wipeChatHistory(thread.id);

  const now = new Date();
  const label = categoryLabel(code);
  const sys = await addSystemMessage(
    thread.id,
    `Sesi chat dimulai · ${label}\n${note}`,
  );

  const updated = await db.chatThread.update({
    where: { id: thread.id },
    data: {
      status: "open",
      category: code,
      category_detail: note,
      admin_joined: false,
      admin_joined_at: null,
      admin_joined_by: "",
      last_message_at: sys.created_at,
      last_preview: previewOf(`${label}: ${note}`, false),
      unread_admin: 1,
      unread_user: 0,
      updated_at: now,
    },
  });

  revalidatePath("/admin/chat");
  return {
    ok: true as const,
    thread: mapThread(updated),
    message: mapMsg(sys),
  };
}

/** Akhiri sesi + hapus seluruh pesan & gambar. UI wajib tampilkan dialog konfirmasi dulu. */
export async function endChatSession() {
  const session = await getSession("user");
  if (!session) return { error: "login" as const };

  const thread = await db.chatThread.findUnique({ where: { user_id: session.sub } });
  if (!thread) return { error: "Tidak ada sesi chat" };
  if (thread.status !== "open") return { error: "Sesi sudah ditutup" };

  // Hapus riwayat DB + file disk (permanen)
  await wipeChatHistory(thread.id);

  const updated = await db.chatThread.update({
    where: { id: thread.id },
    data: {
      status: "closed",
      category: "",
      category_detail: "",
      admin_joined: false,
      admin_joined_at: null,
      admin_joined_by: "",
      last_preview: "",
      unread_admin: 0,
      unread_user: 0,
      last_message_at: new Date(),
    },
  });

  revalidatePath("/admin/chat");
  return { ok: true as const, thread: mapThread(updated) };
}

export async function sendUserChatMessage(body: string, image?: File | null) {
  const session = await getSession("user");
  if (!session) return { error: "login" as const };

  const text = (body || "").trim();
  const hasImage = !!(image && image.size > 0);
  if (!text && !hasImage) return { error: "Pesan atau gambar wajib diisi" };
  if (text.length > MAX_CHAT_BODY) return { error: `Maks ${MAX_CHAT_BODY} karakter` };

  const thread = await getOrCreateUserThread(session.sub);
  if (thread.status !== "open") {
    return { error: "Sesi belum dimulai. Pilih kategori masalah dulu." };
  }

  let image_url: string | null = null;
  if (hasImage && image) {
    const saved = await saveChatImage(thread.id, image);
    if (!saved.ok) return { error: saved.error };
    image_url = saved.url;
  }

  const msg = await db.chatMessage.create({
    data: {
      thread_id: thread.id,
      sender_type: "user",
      sender_id: session.sub,
      body: text,
      image_url,
    },
  });

  await db.chatThread.update({
    where: { id: thread.id },
    data: {
      last_message_at: msg.created_at,
      last_preview: previewOf(text, !!image_url),
      unread_admin: { increment: 1 },
      unread_user: 0,
      status: "open",
    },
  });

  return { ok: true as const, message: mapMsg(msg) };
}

export async function getUserChatUnread() {
  const session = await getSession("user");
  if (!session) return { count: 0 };
  const t = await db.chatThread.findUnique({
    where: { user_id: session.sub },
    select: { unread_user: true, status: true },
  });
  return { count: t?.status === "open" ? t.unread_user ?? 0 : 0 };
}

// ─── Admin ───────────────────────────────────────────────

export async function getChatThreads(page = 1, q = "", status = "open") {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };

  const take = 20;
  const skip = (Math.max(1, page) - 1) * take;
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (q.trim()) {
    where.user = {
      OR: [
        { name: { contains: q.trim(), mode: "insensitive" } },
        { phone_number: { contains: q.trim() } },
      ],
    };
  }

  const [items, totalItems] = await Promise.all([
    db.chatThread.findMany({
      where,
      orderBy: { last_message_at: "desc" },
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, phone_number: true } },
      },
    }),
    db.chatThread.count({ where }),
  ]);

  return {
    ok: true as const,
    items: items.map((t) => ({
      id: t.id,
      status: t.status,
      category: t.category,
      category_label: categoryLabel(t.category),
      category_detail: t.category_detail,
      admin_joined: t.admin_joined,
      last_message_at: t.last_message_at.toISOString(),
      last_preview: t.last_preview,
      unread_admin: t.unread_admin,
      user: t.user,
    })),
    totalItems,
    currentPage: Math.max(1, page),
  };
}

export async function getChatThread(threadId: string, afterId?: string | null) {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };

  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    include: {
      user: { select: { id: true, name: true, phone_number: true } },
    },
  });
  if (!thread) return { error: "not_found" as const };

  let messages;
  if (afterId) {
    const anchor = await db.chatMessage.findUnique({ where: { id: afterId } });
    messages = await db.chatMessage.findMany({
      where: {
        thread_id: thread.id,
        created_at: { gt: anchor?.created_at ?? new Date(0) },
      },
      orderBy: { created_at: "asc" },
      take: PAGE_SIZE,
    });
  } else {
    messages = await db.chatMessage.findMany({
      where: { thread_id: thread.id },
      orderBy: { created_at: "asc" },
      take: 200,
    });
  }

  if (thread.unread_admin > 0 && !afterId) {
    await db.chatThread.update({
      where: { id: thread.id },
      data: { unread_admin: 0 },
    });
  }

  return {
    ok: true as const,
    thread: {
      ...mapThread({
        ...thread,
        unread_admin: afterId ? thread.unread_admin : 0,
      }),
      user: thread.user,
    },
    messages: messages.map(mapMsg),
  };
}

/**
 * Admin bergabung ke sesi — kirim notifikasi system ke user (sekali per sesi).
 * Dipanggil otomatis saat admin buka thread open yang belum join.
 */
export async function joinChatThread(threadId: string) {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };

  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return { error: "not_found" as const };
  if (thread.status !== "open") {
    return { error: "Sesi sudah ditutup" };
  }
  if (thread.admin_joined) {
    return { ok: true as const, already: true as const, thread: mapThread(thread) };
  }

  const admin = await db.adminUser.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true },
  });
  const adminName = admin?.name?.trim() || admin?.email || "Admin";

  const sys = await addSystemMessage(
    thread.id,
    `${adminName} dari tim CS telah bergabung ke sesi chat ini.`,
  );

  const updated = await db.chatThread.update({
    where: { id: thread.id },
    data: {
      admin_joined: true,
      admin_joined_at: new Date(),
      admin_joined_by: session.sub,
      last_message_at: sys.created_at,
      last_preview: previewOf(sys.body, false),
      unread_user: { increment: 1 },
    },
  });

  revalidatePath("/admin/chat");
  return {
    ok: true as const,
    already: false as const,
    thread: mapThread(updated),
    message: mapMsg(sys),
  };
}

export async function sendAdminChatMessage(
  threadId: string,
  body: string,
  image?: File | null,
) {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };

  const text = (body || "").trim();
  const hasImage = !!(image && image.size > 0);
  if (!text && !hasImage) return { error: "Pesan atau gambar wajib diisi" };
  if (text.length > MAX_CHAT_BODY) return { error: `Maks ${MAX_CHAT_BODY} karakter` };

  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return { error: "not_found" as const };
  if (thread.status !== "open") {
    return { error: "Sesi ditutup. User harus memulai sesi baru." };
  }

  // Auto-join if first admin message
  if (!thread.admin_joined) {
    await joinChatThread(threadId);
  }

  let image_url: string | null = null;
  if (hasImage && image) {
    const saved = await saveChatImage(thread.id, image);
    if (!saved.ok) return { error: saved.error };
    image_url = saved.url;
  }

  const msg = await db.chatMessage.create({
    data: {
      thread_id: thread.id,
      sender_type: "admin",
      sender_id: session.sub,
      body: text,
      image_url,
    },
  });

  await db.chatThread.update({
    where: { id: thread.id },
    data: {
      last_message_at: msg.created_at,
      last_preview: previewOf(text, !!image_url),
      unread_user: { increment: 1 },
      unread_admin: 0,
      status: "open",
      admin_joined: true,
      admin_joined_at: thread.admin_joined_at ?? new Date(),
      admin_joined_by: thread.admin_joined_by || session.sub,
    },
  });

  revalidatePath("/admin/chat");
  return { ok: true as const, message: mapMsg(msg) };
}

/** Admin akhiri sesi + hapus seluruh chat & gambar. UI wajib dialog konfirmasi dulu. */
export async function endChatSessionAsAdmin(threadId: string) {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };

  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return { error: "not_found" as const };

  // Hapus riwayat DB + file disk (permanen) — sama seperti end user
  await wipeChatHistory(thread.id);

  const updated = await db.chatThread.update({
    where: { id: thread.id },
    data: {
      status: "closed",
      category: "",
      category_detail: "",
      admin_joined: false,
      admin_joined_at: null,
      admin_joined_by: "",
      last_preview: "",
      unread_admin: 0,
      unread_user: 0,
      last_message_at: new Date(),
    },
  });

  revalidatePath("/admin/chat");
  return { ok: true as const, thread: mapThread(updated) };
}

/** @deprecated — gunakan endChatSessionAsAdmin. Tetap ada untuk kompatibilitas singkat. */
export async function setChatThreadStatus(threadId: string, status: "open" | "closed") {
  const session = await getSession("admin");
  if (!session) return { error: "unauthorized" as const };
  if (status === "closed") {
    return endChatSessionAsAdmin(threadId);
  }
  // Tidak boleh buka sesi dari admin tanpa kategori user
  return { error: "Hanya user yang dapat memulai sesi (dengan kategori masalah)" };
}

export async function getAdminChatUnreadCount() {
  const session = await getSession("admin");
  if (!session) return 0;
  const agg = await db.chatThread.aggregate({
    _sum: { unread_admin: true },
    where: { status: "open" },
  });
  return agg._sum.unread_admin ?? 0;
}
