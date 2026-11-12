import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, ChartNoAxesCombined, CheckCircle2, PackageCheck, ShieldCheck, Store, Truck, Users } from "lucide-react";
import { DEFAULT_COMMISSION_PCT } from "@/lib/marketplace";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sell on Gnananetra",
  description: "Open your store on Gnananetra: reach shoppers across India, get paid for every delivered order, and keep full control of your prices and stock.",
  alternates: { canonical: "/sell" },
};

const BENEFITS = [
  { icon: Users, t: "Shoppers already here", d: "Your products appear in the same search, categories and deals that thousands of buyers use." },
  { icon: BadgeIndianRupee, t: `Pay only when you sell`, d: `No listing fee, no monthly fee. We keep ${DEFAULT_COMMISSION_PCT}% of each sale; the rest is yours.` },
  { icon: Truck, t: "You ship, we tell the customer", d: "Add the courier and tracking number and the customer is emailed straight away." },
  { icon: ShieldCheck, t: "Stock that cannot oversell", d: "When your last unit sells, it sells once. Two buyers can never get the same unit." },
  { icon: ChartNoAxesCombined, t: "See your money clearly", d: "Sales, commission and payouts in one statement, line by line." },
  { icon: PackageCheck, t: "Your prices, your stock", d: "Change a price or a quantity yourself, any time, and it is live at once." },
];

const STEPS = [
  ["Apply", "Tell us about your business. It takes about five minutes."],
  ["Get approved", "Our team checks your details, usually within a day or two."],
  ["List your products", "Add photos, a price and the stock you have."],
  ["Ship and get paid", "Send each order with a tracking number. We pay you after delivery."],
];

export default async function SellPage() {
  const user = await getCurrentUser();
  const cta = user?.role === "seller" ? { href: "/seller", label: "Go to Seller Centre" } : { href: "/sell/apply", label: "Start selling" };
  return (
    <>
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_85%_0%,rgb(249_94_6/0.32)_0%,transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgb(208_160_49/0.16)_0%,transparent_65%)]" />
        <div aria-hidden className="grain -z-10" />
        <div className="wrap py-16 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 ring-1 ring-white/15 animate-rise">
            <Store className="size-4" aria-hidden /> For sellers and small businesses
          </p>
          <h1 className="mt-5 max-w-3xl text-[36px] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-[58px] animate-rise [animation-delay:60ms]">
            Sell to all of India <span className="text-brand">from one store.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/70 sm:text-[18px] animate-rise [animation-delay:120ms]">
            Open your store on Gnananetra. We bring the shoppers, the checkout and the payments. You list, pack and ship.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-rise [animation-delay:180ms]">
            <Link href={cta.href} className="btn-primary px-7 py-4">
              {cta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="#how" className="btn bg-white/10 px-6 py-4 text-white ring-1 ring-white/20 hover:bg-white/15">How it works</Link>
          </div>
          <p className="mt-5 text-[13px] text-white/55">Free to join. {DEFAULT_COMMISSION_PCT}% commission only when you make a sale.</p>
        </div>
      </section>

      <section className="reveal wrap mt-14" aria-labelledby="why">
        <p className="eyebrow mb-1.5">Why sell here</p>
        <h2 id="why" className="section-title mb-6">Everything you need, nothing you don&apos;t</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.t} className="card p-5 transition-shadow hover:shadow-lift">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><b.icon className="size-5" aria-hidden /></span>
              <h3 className="mt-4 text-[16.5px] font-bold">{b.t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{b.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="reveal wrap mt-14 scroll-mt-28" aria-labelledby="how-t">
        <p className="eyebrow mb-1.5">How it works</p>
        <h2 id="how-t" className="section-title mb-6">From application to first payout</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card relative p-5">
              <span className="grid size-9 place-items-center rounded-full bg-ink text-[15px] font-extrabold text-white">{i + 1}</span>
              <h3 className="mt-4 text-[16px] font-bold">{t}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="reveal wrap mt-14" aria-labelledby="need">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-700 p-7 text-white sm:p-12">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_100%_0%,rgb(246_196_93/0.5)_0%,transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgb(11_19_36/0.5)_0%,transparent_65%),linear-gradient(135deg,var(--color-brand-700),var(--color-brand))]" />
          <div aria-hidden className="grain -z-10" />
          <h2 id="need" className="max-w-xl text-[26px] leading-tight font-extrabold tracking-[-0.025em] sm:text-[34px]">What you need to apply</h2>
          <ul className="mt-6 grid gap-3 text-[15px] sm:grid-cols-2">
            {["A mobile number and email", "Your store name and city", "A pickup address for couriers", "GSTIN, if you are GST registered (optional)"].map((x) => (
              <li key={x} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-white/90" aria-hidden /> {x}</li>
            ))}
          </ul>
          <Link href={cta.href} className="btn mt-8 bg-white px-7 py-4 text-ink hover:bg-brand-50">
            {cta.label} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
