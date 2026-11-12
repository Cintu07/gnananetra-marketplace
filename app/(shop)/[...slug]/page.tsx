import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/catalog";
import { plainText } from "@/lib/sanitize";
import { formatDate } from "@/lib/site";
import Breadcrumbs from "@/components/shop/Breadcrumbs";

// Pages written in Admin > Pages: about, privacy, terms, returns, shipping policy, FAQs…
type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.length !== 1) return {};
  const page = await getPage(slug[0]);
  if (!page) return {};
  return { title: page.title, description: page.seoDescription || plainText(page.contentHtml, 158), alternates: { canonical: `/${page.slug}` } };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  if (slug.length !== 1) notFound();
  const page = await getPage(slug[0]);
  if (!page) notFound();
  return (
    <div className="wrap py-8">
      <Breadcrumbs items={[{ label: page.title }]} />
      <article className="card mx-auto mt-6 max-w-3xl p-6 sm:p-10">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.025em]">{page.title}</h1>
        <p className="mt-2 text-[13px] text-muted">Last updated {formatDate(page.updatedAt)}</p>
        <div className="rich mt-6" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      </article>
    </div>
  );
}
