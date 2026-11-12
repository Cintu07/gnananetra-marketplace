import "server-only";
import { rupees } from "@/lib/money";
import { SITE_URL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/site";

// Emails go through Resend when RESEND_API_KEY is set; otherwise they are printed to the
// server console so every flow still works locally. Sending never throws: a mail outage
// must not break checkout.

export async function sendEmail(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Gnananetra <orders@gnananetra.com>";
  if (!key) {
    console.log(`\n[email] to=${to}\n[email] subject=${subject}\n[email] ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)}\n`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text());
  } catch (e) {
    console.error("email failed", e);
  }
}

// Anything a shopper typed goes through esc() before it lands in an email, so a name like
// <a href=...> can't put a link into the staff inbox.
export const esc = (v: string | null | undefined) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const shell = (title: string, body: string) => `
<div style="background:#f5f6f8;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#101828">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eaecf0">
    <div style="padding:20px 24px;border-bottom:3px solid #f95e06">
      <img src="${SITE_URL}/brand/logo.png" alt="Gnananetra" height="36" style="height:36px">
    </div>
    <div style="padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;font-size:12px;color:#667085">
      Gnananetra Industries Private Limited, Vijayawada, Andhra Pradesh
    </div>
  </div>
</div>`;

type MailOrder = {
  number: string;
  name: string;
  email: string | null;
  total: number;
  paymentMethod: string;
  status: string;
  accessKey: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: { name: string; qty: number; lineTotal: number }[];
};

const orderLink = (o: MailOrder) => `${SITE_URL}/order/${o.number}?key=${o.accessKey}`;
const itemsTable = (o: MailOrder) =>
  `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">${o.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eaecf0">${esc(i.name)} × ${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #eaecf0;text-align:right">${rupees(i.lineTotal)}</td></tr>`,
    )
    .join("")}<tr><td style="padding:10px 0;font-weight:bold">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold">${rupees(o.total)}</td></tr></table>`;
const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#c9420c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${label}</a>`;

export function orderPlacedEmail(o: MailOrder) {
  return sendEmail(
    o.email,
    `Order ${o.number} confirmed`,
    shell(
      `Thank you, ${esc(o.name.split(" ")[0]) || "there"}! Your order is confirmed.`,
      `<p style="font-size:14px;line-height:1.6">Order <strong>${o.number}</strong> · ${PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}. We usually dispatch within 1 to 3 working days and will email you the tracking details.</p>${itemsTable(o)}${button(orderLink(o), "View your order")}`,
    ),
  );
}

export function orderStatusEmail(o: MailOrder) {
  const tracking =
    o.status === "shipped" && o.trackingNumber
      ? `<p style="font-size:14px">Courier: <strong>${esc(o.trackingCarrier)}</strong><br>Tracking number: <strong>${esc(o.trackingNumber)}</strong></p>${o.trackingUrl && /^https?:\/\//i.test(o.trackingUrl) ? button(o.trackingUrl, "Track shipment") : ""}`
      : "";
  return sendEmail(
    o.email,
    `Order ${o.number}: ${ORDER_STATUS_LABEL[o.status] ?? o.status}`,
    shell(
      `Your order is ${(ORDER_STATUS_LABEL[o.status] ?? o.status).toLowerCase()}`,
      `<p style="font-size:14px;line-height:1.6">Order <strong>${o.number}</strong> was updated.</p>${tracking}<p style="margin-top:20px">${button(orderLink(o), "View order")}</p>`,
    ),
  );
}

export function newOrderAlert(storeEmail: string, o: MailOrder) {
  return sendEmail(
    storeEmail,
    `New order ${o.number} · ${rupees(o.total)} · ${PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}`,
    shell(`New order ${o.number}`, `<p style="font-size:14px">From ${esc(o.name)}.</p>${itemsTable(o)}${button(`${SITE_URL}/admin/orders`, "Open admin")}`),
  );
}

export function sellerNewOrderEmail(to: string | null, o: { number: string; store: string; city: string | null; items: { name: string; qty: number; lineTotal: number }[]; cod: boolean }) {
  const total = o.items.reduce((n, i) => n + i.lineTotal, 0);
  const rows = o.items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eaecf0">${esc(i.name)} × ${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #eaecf0;text-align:right">${rupees(i.lineTotal)}</td></tr>`).join("");
  return sendEmail(
    to,
    `New order ${o.number} for ${o.store}`,
    shell(
      `You have a new order, ${esc(o.store)}`,
      `<p style="font-size:14px;line-height:1.6">Order <strong>${o.number}</strong>${o.city ? ` to ${esc(o.city)}` : ""} (${o.cod ? "cash on delivery" : "paid online"}). Please pack and ship it, then add the courier and tracking number.</p><table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">${rows}<tr><td style="padding:10px 0;font-weight:bold">Your items</td><td style="padding:10px 0;text-align:right;font-weight:bold">${rupees(total)}</td></tr></table>${button(`${SITE_URL}/seller/orders`, "Open your orders")}`,
    ),
  );
}

export function passwordResetEmail(to: string, link: string) {
  return sendEmail(
    to,
    "Reset your Gnananetra password",
    shell("Reset your password", `<p style="font-size:14px;line-height:1.6">Use the button below to choose a new password. The link works for 1 hour.</p><p>${button(link, "Choose a new password")}</p><p style="font-size:12px;color:#667085">If you did not ask for this, ignore this email.</p>`),
  );
}

export function backInStockEmail(to: string, product: { name: string; slug: string }) {
  return sendEmail(
    to,
    `${product.name} is back in stock`,
    shell("Good news, it's back", `<p style="font-size:14px;line-height:1.6"><strong>${esc(product.name)}</strong> is available again.</p><p>${button(`${SITE_URL}/product/${product.slug}`, "Buy now")}</p>`),
  );
}
