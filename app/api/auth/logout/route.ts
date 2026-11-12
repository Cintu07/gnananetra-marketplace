import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { sameOrigin } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  await endSession();
  return NextResponse.json({ ok: true });
}
