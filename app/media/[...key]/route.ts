import { mediaBucket } from "@/lib/storage";

// Serves admin-uploaded photos from the R2 bucket (Cloudflare). Long cache: every upload
// gets a new random file name, so a file never changes.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const bucket = mediaBucket();
  const key = (await params).key.join("/");
  if (!bucket || !/^uploads\/[\w/.-]+$/.test(key)) return new Response("Not found", { status: 404 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
