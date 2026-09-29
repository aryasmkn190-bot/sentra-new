import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settlePayment } from "@/lib/payment";
import { settleDirectPayment } from "@/lib/direct-order";

/**
 * Webhook Pakasir v2 — dipanggil saat pembayaran sukses (status = completed).
 *
 * Request headers:
 * - X-Secret: <webhook_secret>
 *
 * Request body dari Pakasir v2:
 * {
 *   "txn_id": "vwiqpcriq",
 *   "order_id": "KM-xxx",
 *   "amount": 99000,
 *   "is_sandbox": false,
 *   "status": "completed",
 *   "completed_at": "2026-09-29T10:00:00.000Z"
 * }
 *
 * Docs API v2: https://pakasir.com/p/webhook
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi header X-Secret dari Pakasir
    const configuredSecret = process.env.PAKASIR_WEBHOOK_SECRET;
    const incomingSecret =
      req.headers.get("x-secret") ||
      req.headers.get("X-Secret") ||
      req.headers.get("x-webhook-secret");

    if (configuredSecret && incomingSecret !== configuredSecret) {
      console.warn("[Pakasir Webhook] Ditolak: X-Secret tidak cocok atau tidak ada");
      return NextResponse.json(
        { error: "Unauthorized: Invalid secret" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { amount, order_id, txn_id, status } = body;
    console.log("[Pakasir Webhook]", JSON.stringify(body));

    // Pakasir mengirim webhook hanya ketika transaksi berhasil ("completed")
    if (status !== "completed") {
      console.log("[Pakasir Webhook] Status bukan completed, diabaikan:", status);
      return NextResponse.json({ ok: true, status });
    }

    if (!order_id || amount === undefined || amount === null) {
      return NextResponse.json({ error: "Missing order_id or amount" }, { status: 400 });
    }

    const orderNumber = String(order_id);
    const parsedAmount = Number(amount);
    const gatewayTxnId = txn_id ? String(txn_id) : orderNumber;

    // ── Order Langsung (OL-…) ──────────────────────────────────────────
    if (orderNumber.startsWith("OL-")) {
      const directPayment = await db.directPayment.findFirst({
        where: { order: { order_number: orderNumber } },
        orderBy: { created_at: "desc" },
      });

      if (!directPayment) {
        console.error("[Pakasir Webhook][direct] Payment not found:", orderNumber);
        return NextResponse.json({ error: "Direct payment not found" }, { status: 404 });
      }

      if (directPayment.amount !== parsedAmount) {
        console.error("[Pakasir Webhook][direct] Amount mismatch:", {
          expected: directPayment.amount,
          received: parsedAmount,
        });
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      await settleDirectPayment(directPayment.id, gatewayTxnId, body);
      console.log("[Pakasir Webhook][direct] Settled completed:", orderNumber);
      return NextResponse.json({ ok: true, channel: "direct", txn_id: gatewayTxnId });
    }

    // ── Order online (KM-…) ────────────────────────────────────────────
    const payment = await db.payment.findFirst({
      where: {
        order: { order_number: orderNumber },
      },
      orderBy: { created_at: "desc" },
    });

    if (!payment) {
      console.error("[Pakasir Webhook] Payment not found for order:", orderNumber);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.amount !== parsedAmount) {
      console.error("[Pakasir Webhook] Amount mismatch:", {
        expected: payment.amount,
        received: parsedAmount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await settlePayment(payment.id, gatewayTxnId, body);
    console.log("[Pakasir Webhook] Payment settled:", orderNumber);
    return NextResponse.json({ ok: true, channel: "online", txn_id: gatewayTxnId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Pakasir Webhook] Error:", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** GET — health check / verifikasi webhook URL oleh Pakasir */
export async function GET() {
  return NextResponse.json({
    ok: true,
    gateway: "pakasir",
    version: "v2",
    endpoint: "/api/payments/webhook",
  });
}
