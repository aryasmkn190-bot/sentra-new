/**
 * WhatsApp sender via OpenWA (default) with Evolution API fallback.
 *
 * OpenWA API endpoint: POST {OPENWA_API_URL}/api/sessions/{OPENWA_SESSION}/messages/send-text
 * Headers: { "X-API-Key": OPENWA_API_KEY, "Content-Type": "application/json" }
 * Body: { "chatId": "{phone}@c.us", "text": message }
 */

const OPENWA_API_URL = process.env.OPENWA_API_URL || "https://wa.bergerak.space";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || "";
const OPENWA_SESSION = process.env.OPENWA_SESSION || "010e519c-e841-45cc-8007-4c31ba9c964b";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "default";

/**
 * Normalisasi nomor HP Indonesia.
 * Input:  081234567890, 6281234567890, +6281234567890
 * Output: 6281234567890
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith("62")) cleaned = "62" + cleaned;
  return cleaned;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendWhatsApp(phone: string, message: string): Promise<SendResult> {
  const normalized = normalizePhone(phone);

  // 1. Prioritas utama: OpenWA
  if (OPENWA_API_URL && OPENWA_API_KEY && OPENWA_SESSION) {
    const endpoint = `${OPENWA_API_URL.replace(/\/$/, "")}/api/sessions/${OPENWA_SESSION}/messages/send-text`;
    const chatId = `${normalized}@c.us`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": OPENWA_API_KEY,
        },
        body: JSON.stringify({
          chatId,
          text: message,
        }),
      });

      if (response.ok) {
        console.log(`[WhatsApp:OpenWA] Sent to ${chatId}`);
        return { ok: true };
      }

      const body = await response.text();
      console.error(`[WhatsApp:OpenWA] API error ${response.status}: ${body}`);
    } catch (err: any) {
      console.error(`[WhatsApp:OpenWA] Network error:`, err?.message || err);
    }
  }

  // 2. Fallback: Evolution API jika OpenWA gagal atau belum diset
  if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
    const url = `${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${EVOLUTION_INSTANCE}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: normalized,
          text: message,
        }),
      });

      if (response.ok) {
        console.log(`[WhatsApp:Evolution] Sent to ${normalized}`);
        return { ok: true };
      }
      const body = await response.text();
      console.error(`[WhatsApp:Evolution] API error ${response.status}: ${body}`);
      return { ok: false, error: `WhatsApp API error: ${response.status}` };
    } catch (err: any) {
      console.error(`[WhatsApp:Evolution] Network error:`, err?.message || err);
      return { ok: false, error: "Gagal mengirim WhatsApp." };
    }
  }

  // 3. Fallback mock jika tidak ada gateway aktif
  console.warn("[WhatsApp] No WhatsApp gateway configured. Falling back to console log.");
  console.log(`[WhatsApp][mock] To: ${phone} | Message: ${message}`);
  return { ok: true };
}
