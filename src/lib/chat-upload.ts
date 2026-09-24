import { randomBytes } from "node:crypto";
import { mkdir, writeFile, rm, readdir, unlink } from "node:fs/promises";
import * as path from "node:path";
import {
  ALLOWED_CHAT_IMAGE_TYPES,
  MAX_CHAT_IMAGE_BYTES,
  MAX_CHAT_IMAGE_MB,
} from "@/lib/chat";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "chat");

function extFromMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

/** Save chat image under public/uploads/chat/{threadId}/… Returns public URL path. */
export async function saveChatImage(
  threadId: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "File gambar kosong" };
  }
  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    return { ok: false, error: `Gambar maksimal ${MAX_CHAT_IMAGE_MB} MB` };
  }
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_CHAT_IMAGE_TYPES.includes(mime as (typeof ALLOWED_CHAT_IMAGE_TYPES)[number])) {
    return { ok: false, error: "Format gambar: JPG, PNG, WEBP, atau GIF" };
  }
  const ext = extFromMime(mime);
  if (!ext) return { ok: false, error: "Format gambar tidak didukung" };

  // Sanitize threadId path segment
  if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) {
    return { ok: false, error: "Thread tidak valid" };
  }

  const dir = path.join(UPLOAD_ROOT, threadId);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const abs = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  // Extra magic-byte soft check for jpeg/png/gif/webp
  if (!looksLikeImage(buf, mime)) {
    return { ok: false, error: "File bukan gambar valid" };
  }
  await writeFile(abs, buf);
  // Serve via API route — Next production does not expose files written to
  // public/ after process start (static snapshot). Nginx also aliases /uploads/
  // for the same on-disk path as a secondary path.
  return { ok: true, url: `/api/chat-media/${threadId}/${name}` };
}

function looksLikeImage(buf: Buffer, mime: string) {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === "image/png")
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (mime === "image/gif") return buf.slice(0, 3).toString("ascii") === "GIF";
  if (mime === "image/webp") {
    return (
      buf.slice(0, 4).toString("ascii") === "RIFF" &&
      buf.slice(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

/**
 * Delete ALL image files for a thread (end-session purge).
 * Double-pass: remove dir, wait briefly, remove again if recreated by race.
 * Returns how many files were present before delete (best-effort).
 */
export async function purgeChatImages(threadId: string): Promise<{ ok: true; removedFiles: number }> {
  if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) {
    return { ok: true, removedFiles: 0 };
  }
  const dir = path.join(UPLOAD_ROOT, threadId);
  let removedFiles = 0;

  async function countFiles(d: string): Promise<number> {
    try {
      const entries = await readdir(d, { withFileTypes: true });
      let n = 0;
      for (const e of entries) {
        if (e.isFile()) n += 1;
        else if (e.isDirectory()) n += await countFiles(path.join(d, e.name));
      }
      return n;
    } catch {
      return 0;
    }
  }

  removedFiles = await countFiles(dir);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore missing */
  }
  // Second pass — catch race if a concurrent write recreated the dir
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return { ok: true, removedFiles };
}

/** Best-effort delete a single public image path under /uploads/chat/ or /api/chat-media/ */
export async function tryDeleteChatImage(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  let rel: string | null = null;
  if (publicUrl.startsWith("/uploads/chat/")) {
    rel = publicUrl.replace(/^\//, "");
  } else if (publicUrl.startsWith("/api/chat-media/")) {
    rel = "uploads/chat/" + publicUrl.slice("/api/chat-media/".length);
  } else {
    return;
  }
  const abs = path.join(process.cwd(), "public", rel);
  // ensure still under upload root
  if (!abs.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(abs);
  } catch {
    /* ignore */
  }
  // clean empty dir
  try {
    const dir = path.dirname(abs);
    const left = await readdir(dir);
    if (!left.length) await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
