"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { RupeeInput } from "@/components/admin/rupee-input";
import { useRun } from "@/components/admin/use-run";
import { refreshSiteCache, saveSettings } from "@/app/(admin)/admin/actions";
import type { Settings } from "@/lib/settings-defaults";

type Integrations = { razorpay: boolean; webhook: boolean; email: boolean; images: boolean; siteUrl: string };

function Card({ title, hint, children, onSave, busy }: { title: string; hint?: string; children: React.ReactNode; onSave: () => void; busy: boolean }) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[14px]">{title}</h2>
        {hint && <p className="caption-style leading-snug text-subtle">{hint}</p>}
      </div>
      {children}
      <div className="flex justify-end border-t border-border pt-3">
        <Button variant="primary" size="sm" disabled={busy} onClick={onSave}>
          Save {title.toLowerCase()}
        </Button>
      </div>
    </Panel>
  );
}

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />}
      <span>
        <span className="block text-[13.5px] font-medium">{label}</span>
        <span className="caption-style mt-1 block leading-snug text-subtle">{detail}</span>
      </span>
    </li>
  );
}

export default function SettingsView({ settings, categories, integrations }: { settings: Settings; categories: { slug: string; name: string }[]; integrations: Integrations }) {
  const { run, busy, toastNode } = useRun();
  const [store, setStore] = useState(settings.store);
  const [shipping, setShipping] = useState(settings.shipping);
  const [payments, setPayments] = useState(settings.payments);
  const [home, setHome] = useState(settings.home);
  const [seo, setSeo] = useState(settings.seo);
  const [invoice, setInvoice] = useState(settings.invoice);

  const text = <K extends keyof typeof store>(k: K, label: string, opts: { hint?: string; area?: boolean } = {}) => (
    <Field label={label} htmlFor={`st-${String(k)}`} hint={opts.hint}>
      {opts.area ? (
        <Textarea id={`st-${String(k)}`} value={String(store[k] ?? "")} onChange={(e) => setStore({ ...store, [k]: e.target.value })} className="min-h-[64px]" />
      ) : (
        <Input id={`st-${String(k)}`} value={String(store[k] ?? "")} onChange={(e) => setStore({ ...store, [k]: e.target.value })} />
      )}
    </Field>
  );

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody className="max-w-[1100px]">
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px]">Connections</h2>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => refreshSiteCache())}>
              <RefreshCw className="size-3.5" aria-hidden /> Refresh storefront
            </Button>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            <Status ok={integrations.razorpay} label={integrations.razorpay ? "Razorpay connected" : "Razorpay in test mode"} detail={integrations.razorpay ? "Real payments are on." : "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server to take real payments."} />
            <Status ok={integrations.webhook} label="Payment webhook" detail={integrations.webhook ? "Razorpay confirms payments to the server even if the shopper closes the tab." : "Set RAZORPAY_WEBHOOK_SECRET and add the webhook in the Razorpay dashboard."} />
            <Status ok={integrations.email} label="Emails" detail={integrations.email ? "Order and password emails are sent." : "Add RESEND_API_KEY so customers get order and reset emails (now they are only logged)."} />
            <Status ok={integrations.images} label="Photo storage" detail={integrations.images ? "Uploads are stored in Cloudflare R2." : "Uploads are saved on this computer (local mode). On Cloudflare they go to R2."} />
          </ul>
        </Panel>

        <Card title="Store details" hint="Shown in the header, footer, contact page and on invoices." busy={busy} onSave={() => run(() => saveSettings("store", store))}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("name", "Store name")}
            {text("legalName", "Registered company name", { hint: "Printed on invoices" })}
            {text("phone", "Main phone")}
            {text("altPhone", "Second phone")}
            {text("whatsapp", "WhatsApp number", { hint: "With country code, digits only: 918341417766" })}
            {text("email", "Email", { hint: "New order alerts go here too" })}
            {text("gstin", "GSTIN", { hint: "Printed on invoices. Needed for B2B buyers." })}
            {text("supportHours", "Support hours")}
          </div>
          {text("tagline", "Tagline")}
          {text("storeAddress", "Store address", { area: true })}
          {text("headOfficeAddress", "Head office address", { area: true })}
          {text("mapQuery", "Map search", { hint: "What Google Maps searches for on the Store location page" })}
        </Card>

        <Card title="Delivery" busy={busy} onSave={() => run(() => saveSettings("shipping", shipping))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Free delivery from" htmlFor="sh-free" hint="Orders at or above this ship free">
              <RupeeInput id="sh-free" valuePaise={shipping.freeShippingMin} onChange={(v) => setShipping({ ...shipping, freeShippingMin: v })} />
            </Field>
            <Field label="Delivery charge below that" htmlFor="sh-fee" hint="₹0 = always free">
              <RupeeInput id="sh-fee" valuePaise={shipping.flatFee} onChange={(v) => setShipping({ ...shipping, flatFee: v })} />
            </Field>
            <Field label="Dispatch time" htmlFor="sh-days">
              <Input id="sh-days" value={shipping.dispatchDays} onChange={(e) => setShipping({ ...shipping, dispatchDays: e.target.value })} />
            </Field>
            <Field label="Delivery note" htmlFor="sh-note">
              <Input id="sh-note" value={shipping.serviceNote} onChange={(e) => setShipping({ ...shipping, serviceNote: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card title="Payments" busy={busy} onSave={() => run(() => saveSettings("payments", payments))}>
          <label className="flex items-center justify-between text-[13.5px]">
            Online payments (UPI, cards, net banking)
            <Switch checked={payments.onlineEnabled} onCheckedChange={(v) => setPayments({ ...payments, onlineEnabled: v })} />
          </label>
          <label className="flex items-center justify-between text-[13.5px]">
            Cash on delivery
            <Switch checked={payments.codEnabled} onCheckedChange={(v) => setPayments({ ...payments, codEnabled: v })} />
          </label>
          {payments.codEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="COD handling fee" htmlFor="pm-codfee" hint="₹0 = no fee">
                <RupeeInput id="pm-codfee" valuePaise={payments.codFee} onChange={(v) => setPayments({ ...payments, codFee: v })} />
              </Field>
              <Field label="COD only up to" htmlFor="pm-codmax" hint="₹0 = no limit. Big orders must pay online.">
                <RupeeInput id="pm-codmax" valuePaise={payments.codMaxOrder} onChange={(v) => setPayments({ ...payments, codMaxOrder: v })} />
              </Field>
            </div>
          )}
          <p className="caption-style leading-snug text-subtle">Your old site took 41 of 54 orders as cash on delivery and most were cancelled. A COD limit cuts fake orders on expensive items.</p>
        </Card>

        <Card title="Homepage" busy={busy} onSave={() => run(() => saveSettings("home", home))}>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Announcement bar" htmlFor="hm-ann" hint="The thin dark strip at the very top of every page">
              <Input id="hm-ann" value={home.announcement} onChange={(e) => setHome({ ...home, announcement: e.target.value })} />
            </Field>
            <Field label="Announcement link" htmlFor="hm-annh">
              <Input id="hm-annh" value={home.announcementHref} onChange={(e) => setHome({ ...home, announcementHref: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center justify-between text-[13.5px]">
            Show “Deals of the day”
            <Switch checked={home.showDeals} onCheckedChange={(v) => setHome({ ...home, showDeals: v })} />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13.5px] font-medium">Product rows on the homepage (in this order)</legend>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {categories.map((c) => {
                const idx = home.featuredCategorySlugs.indexOf(c.slug);
                return (
                  <label key={c.slug} className="flex items-center gap-2 text-[13.5px]">
                    <Checkbox
                      checked={idx >= 0}
                      onCheckedChange={(on) =>
                        setHome({ ...home, featuredCategorySlugs: on ? [...home.featuredCategorySlugs, c.slug] : home.featuredCategorySlugs.filter((x) => x !== c.slug) })
                      }
                    />
                    {c.name}
                    {idx >= 0 && <span className="caption-style text-subtle">#{idx + 1}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13.5px] font-medium">Trust badges under the slider</legend>
            {home.trustBadges.map((b, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label={`Badge ${i + 1} title`}
                  value={b.title}
                  onChange={(e) => setHome({ ...home, trustBadges: home.trustBadges.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })}
                />
                <Input
                  aria-label={`Badge ${i + 1} text`}
                  value={b.text}
                  onChange={(e) => setHome({ ...home, trustBadges: home.trustBadges.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })}
                />
              </div>
            ))}
          </fieldset>
        </Card>

        <Card title="Search engines" hint="How the homepage appears on Google." busy={busy} onSave={() => run(() => saveSettings("seo", seo))}>
          <Field label="Title" htmlFor="seo-t">
            <Input id="seo-t" value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} />
          </Field>
          <Field label="Description" htmlFor="seo-d" hint={`${seo.description.length}/160`}>
            <Textarea id="seo-d" value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} />
          </Field>
        </Card>

        <Card title="Invoice" busy={busy} onSave={() => run(() => saveSettings("invoice", invoice))}>
          <Field label="Terms printed at the bottom" htmlFor="inv-terms">
            <Textarea id="inv-terms" value={invoice.terms} onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} />
          </Field>
          <Field label="Signature line" htmlFor="inv-sig">
            <Input id="inv-sig" value={invoice.signatory} onChange={(e) => setInvoice({ ...invoice, signatory: e.target.value })} />
          </Field>
        </Card>
      </PageBody>
      {toastNode}
    </>
  );
}
