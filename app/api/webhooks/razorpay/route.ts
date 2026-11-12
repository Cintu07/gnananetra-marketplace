import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { markPaid, markPaymentFailed } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay dashboard > Webhooks: point to https://<domain>/api/webhooks/razorpay,
// events payment.captured, order.paid, payment.failed, and set RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    event: string;
    payload: { payment?: { entity: { id: string; order_id: string; error_description?: string } }; order?: { entity: { id: string } } };
  };
  const payment = event.payload.payment?.entity;
  const rpOrderId = payment?.order_id ?? event.payload.order?.entity.id;
  if (!rpOrderId) return NextResponse.json({ ok: true });

  const [order] = await db.select({ id: s.orders.id }).from(s.orders).where(eq(s.orders.razorpayOrderId, rpOrderId));
  if (!order) return NextResponse.json({ ok: true }); // not ours (or a test from the dashboard)

  if ((event.event === "payment.captured" || event.event === "order.paid") && payment) {
    await markPaid(order.id, payment.id, "razorpay webhook");
  } else if (event.event === "payment.failed" && payment) {
    await markPaymentFailed(order.id, `Payment failed: ${payment.error_description ?? "declined"}`);
  }
  return NextResponse.json({ ok: true });
}
