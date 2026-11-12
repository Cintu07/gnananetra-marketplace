import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/seller/ProductForm";
import { requireSeller } from "@/lib/seller-auth";
import { categoryOptions, emptyProduct } from "@/lib/seller-products";

export const metadata = { title: "Add a product" };

export default async function NewProduct() {
  await requireSeller();
  const categories = await categoryOptions();
  return (
    <div>
      <Link href="/seller/products" className="mb-2 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Products</Link>
      <h1 className="section-title mb-6">Add a product</h1>
      <ProductForm initial={emptyProduct} categories={categories} />
    </div>
  );
}
