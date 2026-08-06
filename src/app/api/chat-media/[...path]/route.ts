import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import * as path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "chat");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Serve chat images from disk at request time.
 * Next.js production does NOT pick up files written to public/ after `next start`
 * without restart — so static /uploads/... 404s for runtime uploads.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  if (!parts?.length || parts.length > 4) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Only allow safe path segments (uuid + filename)
  for (const p of parts) {
    if (!p || p === "." || p === ".." || p.includes("\\") || p.includes("\0")) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(p)) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const abs = path.resolve(UPLOAD_ROOT, ...parts);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep) && abs !== UPLOAD_ROOT) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const stream = createReadStream(abs);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
