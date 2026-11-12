import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { markPaid, markPaymentFailed } from "@/lib/orders";
import { testPaymentsAllowed, verifyPaymentSignature } from "@/lib/razorpay";
import { limited, sameOrigin } from "@/lib/ratelimit";

// Called by the browser right after the Razorpay window closes. It only proves the
// signature so the success page can show at once; the webhook confirms independently
// and markPaid() is idempotent, so whichever arrives first wins.
const body = z.object({
  number: z.string(),
  key: z.string(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  test: z.enum(["success", "failure"]).optional(),
  failure: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (await limited("verify", 30, 600)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const d = parsed.data;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.number, d.number));
  if (!order || order.accessKey !== d.key) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (d.failure) {
    await markPaymentFailed(order.id, `Payment attempt failed: ${d.failure}`);
    return NextResponse.json({ ok: false });
  }

  if (d.test) {
    if (!testPaymentsAllowed()) return NextResponse.json({ error: "Test payments are switched off" }, { status: 403 });
    if (d.test === "failure") {
      await markPaymentFailed(order.id, "Test payment declined.");
      return NextResponse.json({ ok: false });
    }
    await markPaid(order.id, `pay_test_${randomBytes(7).toString("hex")}`, "test payment");
    return NextResponse.json({ ok: true });
  }

  if (!d.razorpay_order_id || !d.razorpay_payment_id || !d.razorpay_signature) return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  if (d.razorpay_order_id !== order.razorpayOrderId || !verifyPaymentSignature(d.razorpay_order_id, d.razorpay_payment_id, d.razorpay_signature)) {
    await markPaymentFailed(order.id, "Payment signature did not match.");
    return NextResponse.json({ error: "We could not verify this payment. If money was deducted, contact us with your order number." }, { status: 400 });
  }
  await markPaid(order.id, d.razorpay_payment_id, "razorpay checkout");
  return NextResponse.json({ ok: true });
}
