import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, listProducts } from "@/lib/catalog";
import Listing, { parseListParams, type RawParams } from "@/components/shop/Listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = (await getCatalog()).brands.find((x) => x.slug === slug);
  return b ? { title: `${b.name} products`, description: `Genuine ${b.name} products at Gnananetra, with GST invoice and delivery across India.`, alternates: { canonical: `/brand/${slug}` } } : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = (await getCatalog()).brands.find((b) => b.slug === slug);
  if (!brand) notFound();
  const query = parseListParams(sp);
  const result = (await listProducts({ ...query, brands: [slug] }))!;
  return (
    <Listing
      title={brand.name}
      intro={`${brand.count} genuine ${brand.name} products, sold with a GST invoice and manufacturer warranty.`}
      crumbs={[{ href: "/shop", label: "Shop" }, { label: brand.name }]}
      base={`/brand/${slug}`}
      sp={sp}
      result={result}
      showBrandFilter={false}
    />
  );
}
