import { NextResponse } from "next/server";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import { sameOrigin } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  // the team and approved or pending sellers (they upload product photos); nobody else
  const user = await getCurrentUser();
  if (!user || !(isAdminRole(user.role) || user.role === "seller")) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 6 * 1024 * 1024) return NextResponse.json({ error: "Image is larger than 6 MB" }, { status: 400 });
  try {
    const saved = await saveImage(new Uint8Array(await file.arrayBuffer()), String(form?.get("name") ?? file.name.replace(/\.[^.]+$/, "")));
    const width = Number(form?.get("width")) || null;
    const height = Number(form?.get("height")) || null;
    return NextResponse.json({ data: { ...saved, width, height } });
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
