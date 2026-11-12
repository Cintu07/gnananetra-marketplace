"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { endSession, getCurrentUser, isAdminRole, requireUser, startSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { limited } from "@/lib/ratelimit";
import { esc, passwordResetEmail, sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import { safeNext } from "@/lib/safe-next";

// a real scrypt hash of a random string: verifying against it costs the same as a real check
const DUMMY_HASH = "scrypt$16384$8$1$ZHVtbXktc2FsdC0xMjM0NQ$4sNj3V1e9nYQ0dWQ1kCwZ0bQ7k3yXxj0u9fE5n2pL7mQyZ0p3sD1aF8gH2jK4lM6nB8vC0xZ2qW4eR6tY8uI0o";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> } | null;

const email = z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase());
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v), "Enter a valid 10 digit mobile number");
const str = (max = 200) => z.string().trim().max(max);
const fd = (form: FormData) => Object.fromEntries(form.entries()) as Record<string, string>;
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form";

// ---------------------------------------------------------------- newsletter, alerts

export async function subscribe(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("subscribe", 5, 600)) return { error: "Too many attempts, try again later" };
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(s.subscribers).values({ email: parsed.data, source: "footer" }).onConflictDoNothing();
  return { ok: true };
}

export async function requestStockAlert(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("stock-alert", 10, 600)) return { error: "Too many attempts, try again later" };
  const parsed = z.object({ email, productId: z.coerce.number().int().positive() }).safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(s.stockAlerts).values({ productId: parsed.data.productId, email: parsed.data.email }).onConflictDoNothing();
  return { ok: true, message: "We'll email you as soon as it's back." };
}

// ---------------------------------------------------------------- contact / bulk quote

export async function submitInquiry(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("inquiry", 5, 600)) return { error: "Too many messages, please call us instead" };
  if (form.get("website")) return { ok: true }; // honeypot
  const parsed = z
    .object({
      kind: z.enum(["contact", "bulk_quote", "product"]).default("contact"),
      name: str(120).min(2, "Please tell us your name"),
      email: email.optional().or(z.literal("").transform(() => undefined)),
      phone: phone,
      company: str(160).optional(),
      subject: str(200).optional(),
      message: str(4000).min(5, "Please write a short message"),
      quantity: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
      productId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    })
    .safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: fd(form) };
  const d = parsed.data;
  await db.insert(s.inquiries).values({
    kind: d.kind,
    name: d.name,
    email: d.email ?? null,
    phone: d.phone,
    company: d.company || null,
    subject: d.subject || null,
    message: d.message,
    quantity: d.quantity ?? null,
    productId: d.productId ?? null,
  });
  const settings = await getSettings();
  await sendEmail(
    settings.store.email,
    `New ${d.kind === "bulk_quote" ? "bulk quote request" : "enquiry"} from ${d.name}`,
    `<p><strong>${esc(d.name)}</strong> (${esc(d.phone)}${d.email ? `, ${esc(d.email)}` : ""})${d.company ? ` from ${esc(d.company)}` : ""}</p><p>${esc(d.message).replace(/\n/g, "<br>")}</p><p><a href="${SITE_URL}/admin/inquiries">Open in admin</a></p>`,
  );
  return { ok: true, message: "Thanks! Our team will get back to you within one working day." };
}

// ---------------------------------------------------------------- reviews

export async function submitReview(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("review", 3, 600)) return { error: "Too many reviews, try again later" };
  const user = await getCurrentUser();
  const parsed = z
    .object({
      productId: z.coerce.number().int().positive(),
      rating: z.coerce.number().int().min(1, "Choose a star rating").max(5),
      name: str(80).min(2, "Please add your name"),
      title: str(120).optional(),
      body: str(3000).min(10, "Tell us a little more (at least 10 characters)"),
    })
    .safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  let verified = false;
  if (user) {
    const bought = await db
      .select({ id: s.orderItems.id })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orders.userId, user.id), eq(s.orderItems.productId, d.productId), eq(s.orders.paymentStatus, "paid")))
      .limit(1);
    verified = bought.length > 0;
  }
  await db.insert(s.reviews).values({
    productId: d.productId,
    userId: user?.id ?? null,
    name: d.name,
    email: user?.email ?? null,
    rating: d.rating,
    title: d.title || null,
    body: d.body,
    isVerified: verified,
    status: "pending",
  });
  return { ok: true, message: "Thank you! Your review will appear once it has been checked." };
}

// ---------------------------------------------------------------- accounts

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password") }).safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: { email: String(form.get("email") ?? "") } };
  if (await limited("login", 8, 600, parsed.data.email)) return { error: "Too many attempts. Wait a few minutes and try again." };
  const [user] = await db.select().from(s.users).where(eq(s.users.email, parsed.data.email));
  // always run one hash check so response time doesn't reveal whether the email exists
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || user.isBlocked || !user.passwordHash || !ok) {
    return {
      error: "Email or password is not right. Bought from us before without an account? Use “Forgot password” to set one.",
      fields: { email: parsed.data.email },
    };
  }
  await startSession(user);
  redirect(safeNext(form.get("next"), isAdminRole(user.role) ? "/admin" : user.role === "seller" ? "/seller" : "/account"));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("register", 5, 600)) return { error: "Too many attempts, try again later" };
  const parsed = z
    .object({
      name: str(120).min(2, "Please tell us your name"),
      email,
      phone: phone.optional().or(z.literal("").transform(() => undefined)),
      password: z.string().min(8, "Use at least 8 characters for your password").max(200),
    })
    .safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error), fields: { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") } };
  const d = parsed.data;
  const [existing] = await db.select().from(s.users).where(eq(s.users.email, d.email));
  if (existing?.passwordHash) return { error: "An account with this email already exists. Sign in instead.", fields: { email: d.email } };
  const passwordHash = await hashPassword(d.password);
  let user = existing;
  if (existing) {
    // guest who bought before: claim the record (and its order history)
    [user] = await db
      .update(s.users)
      .set({ passwordHash, passwordChangedAt: new Date(), name: d.name || existing.name, phone: d.phone ?? existing.phone })
      .where(eq(s.users.id, existing.id))
      .returning();
  } else {
    [user] = await db.insert(s.users).values({ email: d.email, name: d.name, phone: d.phone ?? null, passwordHash, source: "signup" }).returning();
  }
  await startSession(user);
  redirect(safeNext(form.get("next"), "/account"));
}

export async function logout() {
  await endSession();
  redirect("/");
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (await limited("forgot", 4, 900, parsed.data)) return { error: "Too many attempts, try again later" };
  const [user] = await db.select().from(s.users).where(eq(s.users.email, parsed.data));
  if (user && !user.isBlocked) {
    const token = randomBytes(24).toString("base64url");
    await db.insert(s.passwordResets).values({ userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 3600_000) });
    await passwordResetEmail(parsed.data, `${SITE_URL}/reset-password?token=${token}`);
  }
  // same answer either way, so the form cannot be used to find out who has an account
  return { ok: true, message: "If that email has an account, a reset link is on its way. Check your inbox." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ token: z.string().min(10), password: z.string().min(8, "Use at least 8 characters").max(200) }).safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [reset] = await db
    .select()
    .from(s.passwordResets)
    .where(and(eq(s.passwordResets.tokenHash, sha(parsed.data.token)), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())));
  if (!reset) return { error: "This link has expired or was already used. Ask for a new one." };
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.id, reset.id));
  // invalidate every other reset link for this account as well
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(and(eq(s.passwordResets.userId, reset.userId), isNull(s.passwordResets.usedAt)));
  const [user] = await db
    .update(s.users)
    .set({ passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: new Date() })
    .where(eq(s.users.id, reset.userId))
    .returning();
  await startSession(user);
  redirect(isAdminRole(user.role) ? "/admin" : "/account");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z.object({ name: str(120).min(2, "Please add your name"), phone: phone.optional().or(z.literal("").transform(() => undefined)) }).safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.update(s.users).set({ name: parsed.data.name, phone: parsed.data.phone ?? null }).where(eq(s.users.id, user.id));
  revalidatePath("/account");
  return { ok: true, message: "Saved" };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z.object({ current: z.string(), password: z.string().min(8, "Use at least 8 characters").max(200) }).safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [row] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  if (row.passwordHash && !(await verifyPassword(parsed.data.current, row.passwordHash))) return { error: "Your current password is not right" };
  await db.update(s.users).set({ passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: new Date() }).where(eq(s.users.id, user.id));
  await startSession({ ...row, role: row.role }); // keep this device signed in, sign out the others
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

// ---------------------------------------------------------------- addresses

const addressSchema = z.object({
  id: z.coerce.number().int().optional().or(z.literal("").transform(() => undefined)),
  label: str(40).optional(),
  name: str(120).min(2, "Add the receiver's name"),
  phone,
  company: str(160).optional(),
  gstin: str(15).optional(),
  line1: str(200).min(3, "Add the house / building and street"),
  line2: str(200).optional(),
  landmark: str(120).optional(),
  city: str(80).min(2, "Add the city"),
  state: str(80).min(2, "Choose the state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode should be 6 digits"),
  isDefault: z.string().optional(),
});

export async function saveAddress(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/account/addresses");
  const parsed = addressSchema.safeParse(fd(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { id, isDefault, ...a } = parsed.data;
  const values = { ...a, label: a.label || null, company: a.company || null, gstin: a.gstin?.toUpperCase() || null, line2: a.line2 || null, landmark: a.landmark || null };
  const makeDefault = isDefault === "on";
  if (makeDefault) await db.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, user.id));
  if (id) {
    await db.update(s.addresses).set({ ...values, isDefault: makeDefault }).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id)));
  } else {
    const existing = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id));
    await db.insert(s.addresses).values({ ...values, userId: user.id, isDefault: makeDefault || existing.length === 0 });
  }
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved" };
}

export async function deleteAddress(form: FormData) {
  const user = await requireUser("/account/addresses");
  const id = Number(form.get("id"));
  await db.delete(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id)));
  revalidatePath("/account/addresses");
}

// ---------------------------------------------------------------- order tracking

export async function trackOrder(_: FormState, form: FormData): Promise<FormState> {
  if (await limited("track", 10, 600)) return { error: "Too many attempts, try again later" };
  if (await limited("track-day", 60, 86400)) return { error: "Too many attempts today, please contact us" };
  const number = String(form.get("number") ?? "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "");
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  if (!number || !contact) return { error: "Enter your order number and the email or phone you used" };
  const digits = contact.replace(/\D/g, "").slice(-10);
  const candidates = [number, `WP${number}`, number.startsWith("GN") ? number : `GN${number}`];
  const [order] = await db
    .select({ number: s.orders.number, accessKey: s.orders.accessKey, email: s.orders.email, phone: s.orders.phone })
    .from(s.orders)
    .where(or(...candidates.map((c) => eq(s.orders.number, c))));
  const match = order && (order.email?.toLowerCase() === contact || (digits.length === 10 && (order.phone ?? "").replace(/\D/g, "").endsWith(digits)));
  if (!match) return { error: "We couldn't find an order with those details. Check the number on your confirmation email.", fields: { number, contact } };
  redirect(`/order/${order.number}?key=${order.accessKey}`);
}
