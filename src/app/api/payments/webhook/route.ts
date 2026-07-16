import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settlePayment } from "@/lib/payment";

/**
 * Webhook Pakasir — dipanggil saat pembayaran sukses.
 *
 * Request body dari Pakasir:
 * { amount, order_id, project, status, payment_method, completed_at }
 *
 * Docs: https://pakasir.com/p/docs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, order_id, status } = body;

    console.log("[Pakasir Webhook]", JSON.stringify(body));

    // Validasi payload
    if (status !== "completed") {
      console.log("[Pakasir Webhook] Status not completed:", status);
      return NextResponse.json({ ok: true });
    }
    if (!order_id || !amount) {
      return NextResponse.json({ error: "Missing order_id or amount" }, { status: 400 });
    }

    // Cari payment berdasarkan order_number (order_id dari Pakasir = order_number kita)
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

    // Verifikasi amount
    if (payment.amount !== Number(amount)) {
      console.error("[Pakasir Webhook] Amount mismatch:", { expected: payment.amount, received: amount });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Settle payment (idempotent)
    await settlePayment(
      payment.id,
      order_id, // gateway_transaction_id
      body,     // raw_payload
    );

    console.log("[Pakasir Webhook] Payment settled:", order_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Pakasir Webhook] Error:", e.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** GET — untuk health check / verifikasi webhook oleh Pakasir */
export async function GET() {
  return NextResponse.json({ ok: true, gateway: "pakasir" });
}
