import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import Listing, { parseListParams, type RawParams } from "@/components/shop/Listing";

export const metadata: Metadata = { title: "Deals", alternates: { canonical: "/deals" } };

export default async function DealsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const query = parseListParams(sp);
  const result = (await listProducts({ ...query, deals: true, sort: query.sort ?? "discount" }))!;
  return (
    <Listing
      title="Deals"
      intro="Our sharpest prices right now: limited-quantity deals and products at 20% off or more."
      crumbs={[{ href: "/shop", label: "Shop" }, { label: "Deals" }]}
      base="/deals"
      sp={sp}
      result={result}
    />
  );
}
