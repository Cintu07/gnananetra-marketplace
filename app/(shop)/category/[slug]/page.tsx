import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, listProducts } from "@/lib/catalog";
import Listing, { parseListParams, type RawParams } from "@/components/shop/Listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { categoryBySlug } = await getCatalog();
  const c = categoryBySlug.get(slug);
  if (!c) return {};
  return {
    title: `${c.name}: buy online at the best price`,
    description: c.description || `Shop ${c.count} ${c.name.toLowerCase()} from top brands at Gnananetra. Genuine products, GST invoice and delivery across India.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const result = await listProducts({ ...parseListParams(sp), category: slug });
  if (!result || !result.category) notFound();
  const c = result.category;
  const { categories } = result.catalog;
  const parent = c.parentId ? categories.find((x) => x.id === c.parentId) : null;
  const subs = (c.children.length ? c.children : parent?.children ?? []).filter((k) => k.count > 0 && k.slug !== c.slug);

  return (
    <Listing
      title={c.name}
      intro={c.description}
      crumbs={[{ href: "/shop", label: "Shop" }, ...(parent ? [{ href: `/category/${parent.slug}`, label: parent.name }] : []), { label: c.name }]}
      base={`/category/${slug}`}
      sp={sp}
      result={result}
      subcategories={subs.map((k) => ({ slug: k.slug, name: k.name, count: k.count }))}
    />
  );
}
