import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { PackagePlus, Pencil } from "lucide-react";
import ProductRowActions from "@/components/seller/ProductRowActions";
import { requireSeller } from "@/lib/seller-auth";
import { db, schema as s } from "@/lib/db";
import { rupees } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function SellerProducts() {
  const { seller } = await requireSeller();
  const rows = await db
    .select({
      p: s.products,
      image: sql<string | null>`(select url from product_images where product_id = "products"."id" order by sort limit 1)`,
    })
    .from(s.products)
    .where(eq(s.products.sellerId, seller.id))
    .orderBy(desc(s.products.id));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Catalogue</p>
          <h1 className="section-title">Your products</h1>
        </div>
        <Link href="/seller/products/new" className="btn-primary"><PackagePlus className="size-4" aria-hidden /> Add a product</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-6 grid place-items-center px-6 py-16 text-center">
          <PackagePlus className="size-10 text-faint" aria-hidden />
          <p className="mt-3 text-[17px] font-bold">Add your first product</p>
          <p className="mt-1 max-w-sm text-[14px] text-muted">A good photo, a clear name and an honest price are all it takes.</p>
          <Link href="/seller/products/new" className="btn-dark btn-sm mt-5">Add a product</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map(({ p, image }) => (
            <li key={p.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img src={image} alt="" className="size-16 shrink-0 rounded-xl bg-canvas object-contain p-1 ring-1 ring-line" /> : <span className="size-16 shrink-0 rounded-xl bg-canvas" />}
                <div className="min-w-0">
                  <Link href={`/seller/products/${p.id}`} className="line-clamp-2 text-[15px] leading-snug font-bold hover:text-brand-700">{p.name}</Link>
                  <p className="mt-0.5 text-[13.5px] text-muted tabular-nums">
                    {rupees(p.price)} {p.mrp && p.mrp > p.price && <s className="text-faint">{rupees(p.mrp)}</s>}
                  </p>
                  <p className="mt-1">
                    <span className={`chip ${p.status === "published" ? "bg-success-50 text-success" : p.status === "archived" ? "bg-canvas text-muted" : "bg-warn-50 text-warn"}`}>
                      {p.status === "published" ? (seller.status === "approved" ? "On sale" : "Ready (waiting for approval)") : p.status === "archived" ? "Archived" : "Draft"}
                    </span>
                    {p.stockQty === 0 && <span className="chip ml-1.5 bg-danger-50 text-danger">Out of stock</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ProductRowActions id={p.id} stock={p.stockQty} status={p.status} name={p.name} />
                <Link href={`/seller/products/${p.id}`} className="btn-ghost btn-sm" aria-label={`Edit ${p.name}`}><Pencil className="size-4" aria-hidden /> Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[12.5px] text-muted">Stock is a number you set; when it reaches 0 the product shows as out of stock, and the shop can never sell more than you have.</p>
    </div>
  );
}
