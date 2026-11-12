"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type Uploaded = { url: string; width: number; height: number };

/** Resize to at most 1600px and re-encode as WebP (JPEG where the browser can't make WebP).
 *  The server stores exactly what we send, so all the image work happens here. */
async function prepare(file: File, max = 1600): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Could not read that image. Try a JPG or PNG.");
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the image");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background, like the shop
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, q: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
  let blob = await encode("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("Could not compress the image");
  return { blob, width: canvas.width, height: canvas.height };
}

export async function uploadImage(file: File, name?: string): Promise<Uploaded> {
  const { blob, width, height } = await prepare(file);
  const form = new FormData();
  form.append("file", blob, file.name.replace(/\.[^.]+$/, "") + (blob.type === "image/webp" ? ".webp" : ".jpg"));
  form.append("width", String(width));
  form.append("height", String(height));
  if (name) form.append("name", name);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.data as Uploaded;
}

/** Drop zone / picker. Calls onUploaded once per finished file. */
export function ImageDrop({
  onUploaded,
  multiple = true,
  nameHint,
  className,
  label = "Drop photos here or click to upload",
}: {
  onUploaded: (img: Uploaded) => void;
  multiple?: boolean;
  nameHint?: string;
  className?: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).slice(0, multiple ? 12 : 1);
    setBusy((n) => n + list.length);
    for (const f of list) {
      try {
        onUploaded(await uploadImage(f, nameHint));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-secondary px-4 py-6 text-center transition-colors",
          over ? "border-primary bg-[#FFF7ED]" : "hover:bg-muted",
        )}
      >
        {busy > 0 ? <Loader2 aria-hidden className="size-5 animate-spin text-subtle" /> : <ImagePlus aria-hidden className="size-5 text-subtle" />}
        <span className="caption-style text-soft">{busy > 0 ? `Uploading ${busy}…` : label}</span>
        <span className="caption-style text-faint">JPG, PNG or WebP · resized and compressed automatically</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="sr-only" onChange={(e) => handle(e.target.files)} />
      {error && <p className="caption-style mt-2 text-danger">{error}</p>}
    </div>
  );
}

/** Single image field with preview (banners, categories). */
export function ImageUploader({ value, onUploaded, nameHint }: { value?: string | null; onUploaded: (url: string) => void; nameHint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-white">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-contain p-1" />
        ) : (
          <ImagePlus aria-hidden className="size-5 text-faint" />
        )}
      </div>
      <ImageDrop className="flex-1" multiple={false} nameHint={nameHint} onUploaded={(img) => onUploaded(img.url)} label={value ? "Replace image" : "Upload image"} />
    </div>
  );
}
