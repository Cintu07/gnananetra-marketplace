import "server-only";
import { randomBytes } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Photos uploaded in the admin. The browser already shrinks and converts them to WebP
// (components/admin/ImageUploader.tsx), so the server only checks and stores the bytes:
//  - on Cloudflare: in the R2 bucket bound as MEDIA, served by app/media/[...key]
//  - anywhere else (local dev, a normal server): in public/uploads/

type R2Bucket = {
  put: (key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; httpEtag: string; size: number } | null>;
};

export function mediaBucket(): R2Bucket | null {
  try {
    return ((getCloudflareContext().env as Record<string, unknown>).MEDIA as R2Bucket) ?? null;
  } catch {
    return null;
  }
}

export function storageMode(): "r2" | "disk" {
  return mediaBucket() ? "r2" : "disk";
}

const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/webp": { ext: "webp", magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 },
  "image/avif": { ext: "avif", magic: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  "image/gif": { ext: "gif", magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
};

/** Detect the real image type from the first bytes (never trust the file name). */
export function sniffImage(bytes: Uint8Array) {
  for (const [type, t] of Object.entries(TYPES)) if (bytes.length > 12 && t.magic(bytes)) return { type, ext: t.ext };
  return null;
}

export async function saveImage(bytes: Uint8Array, nameHint = "image") {
  const kind = sniffImage(bytes);
  if (!kind) throw new Error("That file is not a supported image (use JPG, PNG, WebP or AVIF)");
  const slug = nameHint.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const month = new Date().toISOString().slice(0, 7);
  const key = `uploads/${month}/${slug}-${randomBytes(4).toString("hex")}.${kind.ext}`;

  const bucket = mediaBucket();
  if (bucket) {
    await bucket.put(key, bytes, { httpMetadata: { contentType: kind.type, cacheControl: "public, max-age=31536000, immutable" } });
    return { url: `/media/${key}` };
  }
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "public", key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return { url: `/${key}` };
}
