import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import Listing, { parseListParams, type RawParams } from "@/components/shop/Listing";

type Props = { searchParams: Promise<RawParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  return q ? { title: `Search: ${q}`, robots: { index: false } } : { title: "All products", alternates: { canonical: "/shop" } };
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = parseListParams(sp);
  const result = (await listProducts(query))!;
  const title = query.q ? `Results for “${query.q}”` : "All products";
  return (
    <Listing
      title={title}
      intro={query.q ? null : "Printers, computers, power backup, air conditioners and office essentials. Genuine products with GST invoice."}
      crumbs={[{ label: query.q ? "Search" : "Shop" }]}
      base="/shop"
      sp={sp}
      result={result}
    />
  );
}
