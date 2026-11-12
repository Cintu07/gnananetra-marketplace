import { NextResponse } from "next/server";
import { getCards, getSpecsForCompare } from "@/lib/catalog";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const slugs = (params.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 12);
  const mode = params.get("mode");
  if (mode === "cards") return NextResponse.json(await getCards({ slugs }));
  return NextResponse.json(await getSpecsForCompare(slugs.slice(0, 4)));
}
