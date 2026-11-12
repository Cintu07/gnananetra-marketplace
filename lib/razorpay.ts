import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Razorpay over plain HTTPS (no SDK). Without keys the shop runs in test mode: checkout
// shows a "test payment" step instead of the Razorpay window, so the whole flow works
// offline. Production refuses test mode unless ALLOW_TEST_PAYMENTS=true.

const API = "https://api.razorpay.com/v1";

export function razorpayLive() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function testPaymentsAllowed() {
  return !razorpayLive() && (process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true");
}

function auth() {
  return "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`razorpay ${path}: ${res.status} ${body?.error?.description ?? ""}`);
  return body as T;
}

export async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string> = {}) {
  if (!razorpayLive()) return { id: `order_test_${randomBytes(8).toString("hex")}`, amount, currency: "INR", test: true };
  const order = await call<{ id: string; amount: number; currency: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount, currency: "INR", receipt, notes }),
  });
  return { ...order, test: false };
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export type RazorpayPayment = { id: string; order_id: string; status: string; amount: number; method: string };

/** Payments made against a Razorpay order (for the admin "check payment" button). */
export async function fetchOrderPayments(razorpayOrderId: string) {
  if (!razorpayLive()) return [];
  const res = await call<{ items: RazorpayPayment[] }>(`/orders/${razorpayOrderId}/payments`);
  return res.items;
}

export async function refundPayment(paymentId: string, amount: number) {
  if (!razorpayLive()) {
    // never pretend: on the live site a refund without keys would look done while no money moved
    if (!testPaymentsAllowed()) throw new Error("Razorpay keys are not set, so this refund can't be sent. Add the keys, or refund from the Razorpay dashboard.");
    return { id: `rfnd_test_${randomBytes(6).toString("hex")}`, test: true };
  }
  const r = await call<{ id: string }>(`/payments/${paymentId}/refund`, { method: "POST", body: JSON.stringify({ amount }) });
  return { ...r, test: false };
}
