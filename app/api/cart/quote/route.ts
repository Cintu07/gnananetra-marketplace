import { NextResponse } from "next/server";
import { z } from "zod";
import { priceCart } from "@/lib/pricing";
import { getSettingsFresh } from "@/lib/settings";
import { limited, sameOrigin } from "@/lib/ratelimit";

const body = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) })).max(50),
  couponCode: z.string().trim().max(40).nullish(),
  paymentMethod: z.enum(["razorpay", "cod"]).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (await limited("quote", 120, 60)) return NextResponse.json({ error: "Slow down" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const quote = await priceCart(parsed.data.items, await getSettingsFresh(), {
    couponCode: parsed.data.couponCode,
    paymentMethod: parsed.data.paymentMethod,
  });
  return NextResponse.json(quote);
}
