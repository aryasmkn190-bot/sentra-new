/**
 * Pakasir Payment Gateway — integrasi Via URL Redirect.
 *
 * Flow:
 * 1. placeOrder → buat order di DB → redirect user ke URL pembayaran Pakasir
 * 2. User bayar di halaman Pakasir
 * 3. Webhook → Pakasir POST ke /api/payments/webhook → settle payment
 * 4. Atau redirect balik → check status via API
 *
 * Docs: https://pakasir.com/p/docs
 */

const PAKASIR_BASE = "https://app.pakasir.com";
const SLUG = process.env.PAKASIR_SLUG || "";
const API_KEY = process.env.PAKASIR_API_KEY || "";

/** Generate URL pembayaran Pakasir — user akan di-redirect ke sini. */
export function getPaymentUrl(orderId: string, amount: number, returnUrl: string): string {
  const base = `${PAKASIR_BASE}/pay/${SLUG}/${amount}`;
  const params = new URLSearchParams({
    order_id: orderId,
    redirect: returnUrl,
  });
  return `${base}?${params.toString()}`;
}

/** Cek status transaksi via API. */
export async function checkTransaction(orderId: string, amount: number): Promise<{
  ok: boolean;
  status?: string;
  payment_method?: string;
  completed_at?: string;
  error?: string;
}> {
  if (!SLUG || !API_KEY) return { ok: false, error: "Pakasir not configured" };

  const url = `${PAKASIR_BASE}/api/transactiondetail?project=${SLUG}&amount=${amount}&order_id=${orderId}&api_key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };

    const tx = data.transaction;
    return {
      ok: true,
      status: tx.status,
      payment_method: tx.payment_method,
      completed_at: tx.completed_at,
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Batalkan transaksi via API. */
export async function cancelTransaction(orderId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (!SLUG || !API_KEY) return { ok: false, error: "Pakasir not configured" };

  try {
    const res = await fetch(`${PAKASIR_BASE}/api/transactioncancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: SLUG, order_id: orderId, amount, api_key: API_KEY }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Simulasi pembayaran untuk mode sandbox. */
export async function simulatePayment(orderId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (!SLUG || !API_KEY) return { ok: false, error: "Pakasir not configured" };

  try {
    const res = await fetch(`${PAKASIR_BASE}/api/paymentsimulation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: SLUG, order_id: orderId, amount, api_key: API_KEY }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
