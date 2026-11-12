"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { sendEmail, esc } from "@/lib/email";
import { sellerEarnings } from "@/lib/marketplace";
import { SITE_URL } from "@/lib/site";
import { noDashes } from "@/lib/sanitize";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => (e instanceof z.ZodError ? { ok: false, error: e.issues[0]?.message ?? "Check the form" } : { ok: false, error: e instanceof Error ? e.message : "Something went wrong" });

async function load(id: number) {
  const [row] = await db.select({ seller: s.sellers, email: s.users.email }).from(s.sellers).innerJoin(s.users, eq(s.users.id, s.sellers.userId)).where(eq(s.sellers.id, id));
  if (!row) throw new Error("Seller not found");
  return row;
}

const statusMail = (storeName: string, headline: string, body: string) =>
  `<p style="font-size:15px"><strong>${esc(headline)}</strong></p><p style="font-size:14px;line-height:1.6">${body}</p><p style="font-size:13px;color:#667085">${esc(storeName)} · <a href="${SITE_URL}/seller">Seller Centre</a></p>`;

export async function setSellerStatus(id: number, status: "approved" | "rejected" | "suspended", reason?: string): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const { seller, email } = await load(id);
    const why = reason ? noDashes(z.string().trim().max(300).parse(reason)) : null;
    if (status === "rejected" && !why) throw new Error("Give a short reason so the seller knows what to fix");
    await db
      .update(s.sellers)
      .set({ status, rejectionReason: status === "approved" ? null : why, approvedAt: status === "approved" ? seller.approvedAt ?? new Date() : seller.approvedAt })
      .where(eq(s.sellers.id, id));
    await logActivity(admin, status, "seller", id, `${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Suspended"} seller “${seller.storeName}”${why ? `: ${why}` : ""}`);
    if (email) {
      const mail = {
        approved: ["Your store is approved", "Good news: your store is approved and your products are now on sale. Add more products or check your orders any time."],
        rejected: ["About your seller application", `We could not approve your application this time. ${esc(why ?? "")}`],
        suspended: ["Your store has been suspended", `Your products are hidden for now. ${esc(why ?? "Please contact the team.")}`],
      }[status];
      await sendEmail(email, mail[0], statusMail(seller.storeName, mail[0], mail[1]));
    }
    updateTag("catalog");
    return { ok: true, message: status === "approved" ? "Approved. Their products are now on sale." : status === "rejected" ? "Rejected" : "Suspended. Their products are hidden." };
  } catch (e) {
    return fail(e);
  }
}

export async function setSellerCommission(id: number, pct: number | null): Promise<Result> {
  const admin = await requireAdmin({ owner: true });
  try {
    const v = pct === null ? null : z.number().int().min(0).max(50, "Commission can be at most 50%").parse(pct);
    const { seller } = await load(id);
    await db.update(s.sellers).set({ commissionPct: v }).where(eq(s.sellers.id, id));
    await logActivity(admin, "update", "seller", id, `Commission for “${seller.storeName}” set to ${v === null ? "the default" : `${v}%`} (applies to new orders only)`);
    return { ok: true, message: v === null ? "Back to the default rate" : `Commission is now ${v}% on new orders` };
  } catch (e) {
    return fail(e);
  }
}

export async function recordPayout(id: number, amountRupees: number, reference: string, note: string): Promise<Result> {
  const admin = await requireAdmin({ owner: true });
  try {
    const amount = Math.round(z.number().positive("Enter the amount you transferred").max(100_000_000).parse(amountRupees) * 100);
    const { seller, email } = await load(id);
    const { balance } = await sellerEarnings(id);
    if (amount > balance) throw new Error(`That is more than the ₹${(balance / 100).toLocaleString("en-IN")} payable to them`);
    await db.insert(s.payouts).values({ sellerId: id, amount, reference: reference.trim().slice(0, 80) || null, note: noDashes(note.trim().slice(0, 200)) || null });
    await logActivity(admin, "payout", "seller", id, `Recorded a payout of ₹${(amount / 100).toLocaleString("en-IN")} to “${seller.storeName}”`);
    if (email) await sendEmail(email, "A payout was sent to you", statusMail(seller.storeName, `₹${(amount / 100).toLocaleString("en-IN")} was paid to you`, `We transferred ₹${(amount / 100).toLocaleString("en-IN")} to your bank account${reference ? ` (reference ${esc(reference)})` : ""}. See the details under Earnings.`));
    return { ok: true, message: "Payout recorded" };
  } catch (e) {
    return fail(e);
  }
}
