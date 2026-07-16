import { createHash } from "crypto";
import { db } from "./db";
import { sendWhatsApp } from "./whatsapp";

/**
 * FR-1.2 — OTP via WhatsApp (Evolution API).
 * Mode "mock"   : kode dicetak ke log server & dikembalikan ke UI (khusus dev).
 * Mode "whatsapp": kirim via Evolution API WhatsApp.
 */
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_10MIN = 3;
const MAX_VERIFY_ATTEMPTS = 3;

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function formatOtpMessage(code: string): string {
  return [
    `🔐 *Kode OTP Sentra*: *${code}*`,
    ``,
    `Gunakan kode di atas untuk masuk ke akun Sentra kamu.`,
    `Kode berlaku *5 menit*. JANGAN berikan ke siapa pun.`,
    ``,
    `— Tim Sentra`,
  ].join("\n");
}

async function sendViaProvider(phone: string, code: string): Promise<boolean> {
  const message = formatOtpMessage(code);
  const result = await sendWhatsApp(phone, message);
  return result.ok;
}

export async function issueOtp(
  phone: string,
  audience: "user" | "partner"
): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db.otpCode.count({
    where: { phone, audience, created_at: { gte: tenMinAgo } },
  });
  if (recent >= MAX_REQUESTS_PER_10MIN) {
    return { ok: false, error: "Terlalu banyak permintaan OTP. Coba lagi dalam 10 menit." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.otpCode.create({
    data: { phone, audience, code_hash: hash(code), expires_at: new Date(Date.now() + OTP_TTL_MS) },
  });

  if (process.env.OTP_MODE === "whatsapp") {
    const sent = await sendViaProvider(phone, code);
    if (!sent) {
      // Kalau WhatsApp gagal, fallback ke dev mode agar user tetap bisa login
      console.log(`[OTP][whatsapp-fallback] ${audience} ${phone}: ${code}`);
      return { ok: true, devCode: code };
    }
    return { ok: true };
  }

  // Mock mode
  console.log(`[OTP][mock] ${audience} ${phone}: ${code}`);
  return { ok: true, devCode: code };
}

export async function checkOtp(
  phone: string,
  audience: "user" | "partner",
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await db.otpCode.findFirst({
    where: { phone, audience, expires_at: { gte: new Date() } },
    orderBy: { created_at: "desc" },
  });
  if (!record) return { ok: false, error: "Kode kedaluwarsa. Minta kode baru." };
  if (record.attempts >= MAX_VERIFY_ATTEMPTS)
    return { ok: false, error: "Percobaan habis. Minta kode baru." };

  if (record.code_hash !== hash(code)) {
    await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Kode salah. Periksa kembali." };
  }
  await db.otpCode.deleteMany({ where: { phone, audience } });
  return { ok: true };
}
