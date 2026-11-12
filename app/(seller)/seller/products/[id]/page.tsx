import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/seller/ProductForm";
import { requireSeller } from "@/lib/seller-auth";
import { categoryOptions, loadProduct } from "@/lib/seller-products";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { seller } = await requireSeller();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [initial, categories] = await Promise.all([loadProduct(id, seller.id), categoryOptions()]);
  if (!initial) notFound();
  return (
    <div>
      <Link href="/seller/products" className="mb-2 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Products</Link>
      <h1 className="section-title mb-6">Edit product</h1>
      <ProductForm key={id} initial={initial} categories={categories} />
    </div>
  );
}
