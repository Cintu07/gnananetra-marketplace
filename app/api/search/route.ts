import { NextResponse } from "next/server";
import { searchSuggest } from "@/lib/catalog";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  return NextResponse.json(await searchSuggest(q, 6), { headers: { "Cache-Control": "public, max-age=60" } });
}
