/**
 * Pakasir Payment Gateway — Integrasi API v2 (Mode Produksi).
 *
 * Flow:
 * 1. placeOrder / placeDirectOrder → panggil getPaymentUrl(orderNumber, amount, returnUrl)
 * 2. API v2 membuat transaksi via POST /api/v2/create-transaction/{slug}/{order_id}
 * 3. Ambil payment_link dari respons Pakasir dan tambahkan parameter redirect
 * 4. User diarahkan ke halaman pembayaran Pakasir (QRIS, VA, E-Wallet)
 * 5. Setelah bayar sukses, Pakasir mengirim Webhook HTTP POST ke /api/payments/webhook
 * 6. Webhook memvalidasi header X-Secret, mencocokkan nominal, dan menyelesaikan pesanan (settle)
 *
 * Docs API v2: https://pakasir.com/p/create-transaction
 */

const PAKASIR_BASE = "https://app.pakasir.com";

function getCredentials() {
  return {
    slug: process.env.PAKASIR_SLUG || "sentra",
    apiKey: process.env.PAKASIR_API_KEY || "",
    webhookSecret: process.env.PAKASIR_WEBHOOK_SECRET || "",
  };
}

export interface CreateTransactionResult {
  ok: boolean;
  txn_id?: string;
  payment_link?: string;
  qr_string?: string;
  total_payment?: number;
  error?: string;
}

/**
 * Buat transaksi baru di Pakasir v2.
 * API ini bersifat "find or create new" — jika dipanggil ulang dengan order_id dan amount yang sama,
 * respons yang dikembalikan akan tetap sama.
 */
export async function createTransaction(
  orderId: string,
  amount: number,
  method: string = "payment_link"
): Promise<CreateTransactionResult> {
  const { slug, apiKey } = getCredentials();
  if (!slug || !apiKey) {
    return { ok: false, error: "Pakasir belum dikonfigurasi (slug atau api_key kosong)" };
  }

  try {
    const res = await fetch(`${PAKASIR_BASE}/api/v2/create-transaction/${slug}/${encodeURIComponent(orderId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        method,
        amount: Math.round(amount),
      }),
    });

    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data) {
      const err = data?.message || data?.error || `HTTP ${res.status}`;
      console.error("[Pakasir v2] createTransaction failed:", { orderId, amount, err });
      return { ok: false, error: String(err) };
    }

    return {
      ok: true,
      txn_id: data.txn_id,
      payment_link: data.payment_link,
      qr_string: data.qr_string,
      total_payment: data.total_payment,
    };
  } catch (e: any) {
    console.error("[Pakasir v2] Network error:", e);
    return { ok: false, error: e?.message || "Gagal menghubungi server Pakasir" };
  }
}

/**
 * Generate URL pembayaran Pakasir v2.
 * Otomatis memanggil create-transaction dan menyematkan parameter redirect ke halaman pesanan.
 */
export async function getPaymentUrl(
  orderId: string,
  amount: number,
  returnUrl: string
): Promise<string> {
  const res = await createTransaction(orderId, amount, "payment_link");
  if (!res.ok || !res.payment_link) {
    throw new Error(res.error || "Gagal membuat link pembayaran Pakasir");
  }

  try {
    const url = new URL(res.payment_link);
    if (returnUrl) {
      url.searchParams.set("redirect", returnUrl);
    }
    return url.toString();
  } catch {
    const sep = res.payment_link.includes("?") ? "&" : "?";
    return returnUrl ? `${res.payment_link}${sep}redirect=${encodeURIComponent(returnUrl)}` : res.payment_link;
  }
}

/**
 * Cek status transaksi via API v2 (menggunakan txn_id).
 * Endpoint: GET /api/v2/transaction-status/{slug}/{txn_id}
 */
export async function checkTransaction(txnId: string): Promise<{
  ok: boolean;
  status?: string;
  order_id?: string;
  amount?: number;
  completed_at?: string | null;
  error?: string;
}> {
  const { slug, apiKey } = getCredentials();
  if (!slug || !apiKey) return { ok: false, error: "Pakasir belum dikonfigurasi" };

  try {
    const res = await fetch(`${PAKASIR_BASE}/api/v2/transaction-status/${slug}/${encodeURIComponent(txnId)}`, {
      method: "GET",
      headers: { "X-Api-Key": apiKey },
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data) return { ok: false, error: data?.message || `HTTP ${res.status}` };

    return {
      ok: true,
      status: data.status,
      order_id: data.order_id,
      amount: data.amount,
      completed_at: data.completed_at,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Gagal cek status transaksi" };
  }
}

/**
 * Batalkan transaksi via API v2 (menggunakan txn_id).
 * Endpoint: POST /api/v2/cancel-transaction/{slug}/{txn_id}
 */
export async function cancelTransaction(txnId: string): Promise<{ ok: boolean; error?: string }> {
  const { slug, apiKey } = getCredentials();
  if (!slug || !apiKey) return { ok: false, error: "Pakasir belum dikonfigurasi" };

  try {
    const res = await fetch(`${PAKASIR_BASE}/api/v2/cancel-transaction/${slug}/${encodeURIComponent(txnId)}`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Gagal membatalkan transaksi" };
  }
}

/**
 * Simulasi pembayaran untuk dev/sandbox compatibility.
 */
export async function simulatePayment(orderId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error: "Sistem menggunakan Pakasir mode produksi langsung. Silakan bayar menggunakan QRIS/VA nyata.",
  };
}
