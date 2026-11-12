"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { saveSellerProduct, type SellerProductInput } from "@/app/(seller)/seller/actions";
import { uploadImage } from "@/components/admin/ImageUploader";

export type Initial = {
  id?: number;
  name: string;
  categoryId: number | null;
  price: string; // rupees as typed
  mrp: string;
  stockQty: string;
  sku: string;
  gstRate: number;
  hsn: string;
  warranty: string;
  highlights: string[];
  description: string;
  images: { url: string; width: number | null; height: number | null }[];
  status: "published" | "draft";
};

const toPaise = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(/,/g, "")) * 100));

export default function ProductForm({ initial, categories }: { initial: Initial; categories: { id: number; name: string; depth: number }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(0);
  const [upErr, setUpErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setF((x) => ({ ...x, [k]: v }));

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setUpErr("");
    for (const file of Array.from(files).slice(0, 8 - f.images.length)) {
      setBusy((n) => n + 1);
      try {
        const up = await uploadImage(file, f.name || "product");
        setF((x) => ({ ...x, images: [...x.images, { url: up.url, width: up.width, height: up.height }].slice(0, 8) }));
      } catch (e) {
        setUpErr(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  function submit(status: "published" | "draft") {
    setError("");
    setSaved("");
    const price = toPaise(f.price);
    const input: SellerProductInput = {
      id: f.id,
      name: f.name,
      categoryId: f.categoryId ?? 0,
      price: price ?? 0,
      mrp: toPaise(f.mrp),
      stockQty: Number(f.stockQty || 0),
      sku: f.sku || null,
      gstRate: f.gstRate,
      hsn: f.hsn || null,
      warranty: f.warranty || null,
      highlights: f.highlights.map((h) => h.trim()).filter(Boolean),
      description: f.description,
      images: f.images,
      status,
    };
    start(async () => {
      const r = await saveSellerProduct(input);
      if (!r.ok) return setError(r.error);
      setSaved(r.message ?? "Saved");
      setF((x) => ({ ...x, id: r.data?.id ?? x.id, status }));
      if (!f.id && r.data) router.replace(`/seller/products/${r.data.id}`);
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(f.status);
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-[17px] font-bold">Basics</h2>
          <div>
            <label className="label" htmlFor="p-name">Product name</label>
            <input id="p-name" className="field" value={f.name} maxLength={200} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Brother HL-L2321D Laser Printer" />
          </div>
          <div>
            <label className="label" htmlFor="p-cat">Category</label>
            <select id="p-cat" className="field" value={f.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{`${"  ".repeat(c.depth)}${c.name}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-desc">Description</label>
            <textarea id="p-desc" className="field min-h-36" value={f.description} maxLength={8000} onChange={(e) => set("description", e.target.value)} placeholder="What is it, what is in the box, who is it for? Leave a blank line between paragraphs." />
          </div>
          <div>
            <p className="label">Highlights <span className="font-normal text-muted">(short bullet points)</span></p>
            <ul className="space-y-2">
              {f.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <input aria-label={`Highlight ${i + 1}`} className="field !py-2.5" value={h} maxLength={300} onChange={(e) => set("highlights", f.highlights.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" aria-label="Remove highlight" onClick={() => set("highlights", f.highlights.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-full text-faint hover:bg-canvas hover:text-ink"><X className="size-4" aria-hidden /></button>
                </li>
              ))}
            </ul>
            {f.highlights.length < 10 && (
              <button type="button" onClick={() => set("highlights", [...f.highlights, ""])} className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-brand-700"><Plus className="size-4" aria-hidden /> Add a highlight</button>
            )}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-[17px] font-bold">Photos</h2>
          <p className="mt-1 text-[13.5px] text-muted">The first photo is the cover. Up to 8. Clear, bright, plain background works best.</p>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {f.images.map((img, i) => (
              <li key={img.url} className="relative aspect-square overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-contain p-1.5" />
                {i === 0 && <span className="chip absolute bottom-1.5 left-1.5 bg-ink text-white">Cover</span>}
                <button type="button" aria-label="Remove photo" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid size-10 place-items-center rounded-full bg-white/95 text-ink shadow-card hover:bg-white"><X className="size-4" aria-hidden /></button>
              </li>
            ))}
            {f.images.length < 8 && (
              <li>
                <button type="button" onClick={() => file.current?.click()} className="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-line-2 text-muted transition-colors hover:border-brand-700 hover:text-brand-700">
                  {busy ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <span className="flex flex-col items-center gap-1 text-[12.5px] font-semibold"><ImagePlus className="size-6" aria-hidden /> Add photo</span>}
                </button>
              </li>
            )}
          </ul>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          {upErr && <p role="alert" className="mt-3 text-[13px] text-danger">{upErr}</p>}
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-40 lg:self-start">
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-[17px] font-bold">Price and stock</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-price">Selling price (₹)</label>
              <input id="p-price" className="field" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="9,999" />
            </div>
            <div>
              <label className="label" htmlFor="p-mrp">MRP (₹)</label>
              <input id="p-mrp" className="field" inputMode="decimal" value={f.mrp} onChange={(e) => set("mrp", e.target.value.replace(/[^\d.]/g, ""))} placeholder="optional" />
            </div>
          </div>
          <p className="-mt-2 text-[12.5px] text-muted">Prices include GST.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-stock">Units in stock</label>
              <input id="p-stock" className="field" inputMode="numeric" value={f.stockQty} onChange={(e) => set("stockQty", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="0" />
            </div>
            <div>
              <label className="label" htmlFor="p-gst">GST rate</label>
              <select id="p-gst" className="field" value={f.gstRate} onChange={(e) => set("gstRate", Number(e.target.value))}>
                {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-sku">SKU <span className="font-normal text-muted">(optional)</span></label>
              <input id="p-sku" className="field" value={f.sku} maxLength={80} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-hsn">HSN code <span className="font-normal text-muted">(optional)</span></label>
              <input id="p-hsn" className="field" value={f.hsn} maxLength={12} onChange={(e) => set("hsn", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="p-war">Warranty <span className="font-normal text-muted">(optional)</span></label>
            <input id="p-war" className="field" value={f.warranty} maxLength={120} onChange={(e) => set("warranty", e.target.value)} placeholder="e.g. 1 year manufacturer warranty" />
          </div>
        </section>

        <section className="card space-y-3 p-5 sm:p-6">
          {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2.5 text-[13.5px] text-danger">{error}</p>}
          {saved && <p role="status" className="rounded-lg bg-success-50 px-3 py-2.5 text-[13.5px] text-success">{saved}</p>}
          <button type="button" disabled={pending} onClick={() => submit("published")} className="btn-primary w-full">{pending ? "Saving" : f.status === "published" && f.id ? "Save changes" : "Publish product"}</button>
          <button type="button" disabled={pending} onClick={() => submit("draft")} className="btn-outline w-full">Save as draft</button>
        </section>
      </aside>
    </form>
  );
}
