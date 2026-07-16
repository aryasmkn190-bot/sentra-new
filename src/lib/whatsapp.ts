/**
 * WhatsApp sender via Evolution API.
 *
 * Evolution API endpoint: POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
 * Headers: { apikey: EVOLUTION_API_KEY }
 *
 * Docs: https://doc.evolution-api.com/
 *
 * Required env:
 *   EVOLUTION_API_URL     - e.g. https://evoapi.locusgroup.store
 *   EVOLUTION_API_KEY     - API key dari Evolution instance
 *   EVOLUTION_INSTANCE    - Nama instance (default: "default")
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "default";

/**
 * Normalisasi nomor HP Indonesia.
 * Input:  081234567890, 6281234567890, +6281234567890
 * Output: 6281234567890@s.whatsapp.net  (format Evolution API: number tanpa @s.whatsapp.net)
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
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn("[WhatsApp] Evolution API not configured. Falling back to console log.");
    console.log(`[WhatsApp][mock] To: ${phone} | Message: ${message}`);
    return { ok: true }; // fallback agar tidak blocking dev
  }

  const normalized = normalizePhone(phone);
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

    if (!response.ok) {
      const body = await response.text();
      console.error(`[WhatsApp] Evolution API error ${response.status}: ${body}`);
      return { ok: false, error: `WhatsApp API error: ${response.status}` };
    }

    console.log(`[WhatsApp] Sent to ${normalized}: ${message}`);
    return { ok: true };
  } catch (err: any) {
    console.error(`[WhatsApp] Network error:`, err.message);
    return { ok: false, error: "Gagal mengirim WhatsApp. Coba lagi nanti." };
  }
}
