import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutError, createOrder } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";
import { limited, sameOrigin } from "@/lib/ratelimit";
import { razorpayLive } from "@/lib/razorpay";

const address = z.object({
  name: z.string().trim().min(2, "Add the receiver's name").max(120),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(160).nullish(),
  line1: z.string().trim().min(3, "Add the house / building and street").max(200),
  line2: z.string().trim().max(200).nullish(),
  landmark: z.string().trim().max(120).nullish(),
  city: z.string().trim().min(2, "Add the city").max(80),
  state: z.string().trim().min(2, "Choose the state").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode should be 6 digits"),
});

const body = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) })).min(1, "Your cart is empty").max(50),
  name: z.string().trim().min(2, "Please add your name").max(120),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v), "Enter a valid 10 digit mobile number"),
  shipping: address,
  billing: address.nullish(),
  company: z.string().trim().max(160).nullish(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "That GSTIN doesn't look right")
    .nullish()
    .or(z.literal("").transform(() => null)),
  couponCode: z.string().trim().max(40).nullish(),
  paymentMethod: z.enum(["razorpay", "cod"]),
  note: z.string().trim().max(1000).nullish(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (await limited("checkout", 12, 600)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details" }, { status: 400 });
  const d = parsed.data;
  const user = await getCurrentUser();
  try {
    const order = await createOrder(
      {
        ...d,
        shipping: { ...d.shipping, phone: d.shipping.phone || d.phone, country: "IN" },
        billing: d.billing ? { ...d.billing, country: "IN" } : null,
        company: d.company || null,
        gstin: d.gstin || null,
        couponCode: d.couponCode || null,
        note: d.note || null,
      },
      user?.id ?? null,
    );
    return NextResponse.json({
      number: order.number,
      key: order.accessKey,
      total: order.total,
      paymentMethod: order.paymentMethod,
      razorpay:
        order.paymentMethod === "razorpay"
          ? { orderId: order.razorpayOrderId, keyId: razorpayLive() ? process.env.RAZORPAY_KEY_ID : null, test: order.testPayment }
          : null,
      customer: { name: d.name, email: d.email, phone: d.phone },
    });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Something went wrong placing your order. Please try again." }, { status: 500 });
  }
}
