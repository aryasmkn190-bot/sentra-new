import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settlePayment } from "@/lib/payment";
import { settleDirectPayment } from "@/lib/direct-order";

/**
 * Webhook Pakasir — dipanggil saat pembayaran sukses.
 *
 * Request body dari Pakasir:
 * { amount, order_id, project, status, payment_method, completed_at }
 *
 * Docs: https://pakasir.com/p/docs
 *
 * Dual path:
 * - order_id prefix OL- → Order Langsung (DirectOrder) → auto completed
 * - else → Order online → confirmed + picking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, order_id, status } = body;

    console.log("[Pakasir Webhook]", JSON.stringify(body));

    if (status !== "completed") {
      console.log("[Pakasir Webhook] Status not completed:", status);
      return NextResponse.json({ ok: true });
    }
    if (!order_id || !amount) {
      return NextResponse.json({ error: "Missing order_id or amount" }, { status: 400 });
    }

    // ── Order Langsung (OL-…) ──────────────────────────────────────────
    if (String(order_id).startsWith("OL-")) {
      const directPayment = await db.directPayment.findFirst({
        where: { order: { order_number: order_id } },
        orderBy: { created_at: "desc" },
      });
      if (!directPayment) {
        console.error("[Pakasir Webhook][direct] Payment not found:", order_id);
        return NextResponse.json({ error: "Direct payment not found" }, { status: 404 });
      }
      if (directPayment.amount !== Number(amount)) {
        console.error("[Pakasir Webhook][direct] Amount mismatch:", {
          expected: directPayment.amount,
          received: amount,
        });
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }
      await settleDirectPayment(directPayment.id, order_id, body);
      console.log("[Pakasir Webhook][direct] Settled completed:", order_id);
      return NextResponse.json({ ok: true, channel: "direct" });
    }

    // ── Order online (KM-…) ────────────────────────────────────────────
    const payment = await db.payment.findFirst({
      where: {
        order: { order_number: order_id },
      },
      orderBy: { created_at: "desc" },
    });

    if (!payment) {
      console.error("[Pakasir Webhook] Payment not found for order:", order_id);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.amount !== Number(amount)) {
      console.error("[Pakasir Webhook] Amount mismatch:", { expected: payment.amount, received: amount });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await settlePayment(payment.id, order_id, body);

    console.log("[Pakasir Webhook] Payment settled:", order_id);
    return NextResponse.json({ ok: true, channel: "online" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Pakasir Webhook] Error:", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** GET — health check / verifikasi webhook oleh Pakasir */
export async function GET() {
  return NextResponse.json({ ok: true, gateway: "pakasir" });
}
