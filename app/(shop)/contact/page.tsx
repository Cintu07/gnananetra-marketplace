import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Mail, MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ContactForm from "@/components/shop/ContactForm";

export const metadata: Metadata = { title: "Contact us and bulk orders", description: "Call, email or write to Gnananetra for product advice, bulk quotes and order help." };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; product?: string }> }) {
  const { topic, product } = await searchParams;
  const { store } = await getSettings();
  const productId = Number(product);
  const [p] = Number.isInteger(productId) && productId > 0 ? await db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(eq(s.products.id, productId)) : [];

  return (
    <div className="wrap py-10">
      <div className="max-w-2xl">
        <p className="eyebrow">We&apos;re here to help</p>
        <h1 className="mt-2 text-[32px] leading-tight font-extrabold tracking-[-0.025em]">{topic === "bulk" ? "Request a bulk quote" : "Contact us"}</h1>
        <p className="mt-3 text-[15.5px] text-muted">
          {topic === "bulk"
            ? "Buying for an office, school or institution? Tell us what you need and how many, and we'll send a quote with GST invoice and delivery timelines."
            : "Questions about a product, an order or a bulk purchase? Send us a message or call, we usually reply within one working day."}
        </p>
      </div>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card p-6 sm:p-8">
          <ContactForm initialKind={topic === "bulk" || p ? "bulk_quote" : "contact"} product={p ?? null} />
        </div>
        <aside className="space-y-4">
          <div className="card space-y-4 p-6 text-[14.5px]">
            <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-start gap-3 hover:text-brand-700">
              <Phone className="mt-0.5 size-5 text-brand-700" aria-hidden />
              <span>
                <span className="block font-bold">Sales and support</span>
                {store.phone}
                {store.altPhone && <span className="block">{store.altPhone}</span>}
              </span>
            </a>
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener" className="flex items-start gap-3 hover:text-brand-700">
                <MessageCircle className="mt-0.5 size-5 text-brand-700" aria-hidden />
                <span>
                  <span className="block font-bold">WhatsApp</span>
                  Chat with us
                </span>
              </a>
            )}
            <a href={`mailto:${store.email}`} className="flex items-start gap-3 hover:text-brand-700">
              <Mail className="mt-0.5 size-5 text-brand-700" aria-hidden />
              <span>
                <span className="block font-bold">Email</span>
                {store.email}
              </span>
            </a>
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 text-brand-700" aria-hidden />
              <span>
                <span className="block font-bold">Hours</span>
                {store.supportHours}
              </span>
            </p>
          </div>
          <div className="card space-y-4 p-6 text-[14px]">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <span>
                <span className="block font-bold">Store</span>
                {store.storeAddress}
              </span>
            </p>
            {store.headOfficeAddress && (
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <span className="block font-bold">Head office</span>
                  {store.headOfficeAddress}
                </span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
