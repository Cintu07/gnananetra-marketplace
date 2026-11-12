import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const COOKIE = "gn_session";
const ADMIN_ROLES = new Set(["admin", "staff"]);

export type Session = { uid: number; role: string; name: string; email: string | null; issuedAt: number };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters)");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(value);
}

export async function startSession(user: { id: number; role: string; name: string; email: string | null }) {
  // staff sessions are short; shoppers stay signed in for a month
  const days = ADMIN_ROLES.has(user.role) ? 2 : 30;
  const token = await new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86400,
  });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: Number(payload.sub),
      role: String(payload.role ?? "customer"),
      name: String(payload.name ?? ""),
      email: (payload.email as string | null) ?? null,
      issuedAt: Number(payload.iat ?? 0) * 1000,
    };
  } catch {
    return null;
  }
});

/** The signed-in person, re-read from the database (so blocking or demotion takes effect at once). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      isBlocked: schema.users.isBlocked,
      passwordChangedAt: schema.users.passwordChangedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.uid));
  if (!user || user.isBlocked) return null;
  // a password change or reset signs out every older session (JWT iat has 1s precision)
  if (user.passwordChangedAt && session.issuedAt < user.passwordChangedAt.getTime() - 1000) return null;
  const { passwordChangedAt: _p, ...rest } = user;
  void _p;
  return rest;
});

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Admin pages and actions. `owner` limits to the admin role (settings, staff). */
export async function requireAdmin(opts: { owner?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) redirect("/admin/login");
  if (opts.owner && user.role !== "admin") redirect("/admin?error=owner-only");
  return user;
}

/** For route handlers: returns the admin or null instead of redirecting. */
export async function adminOrNull() {
  const user = await getCurrentUser();
  return user && ADMIN_ROLES.has(user.role) ? user : null;
}

export function isAdminRole(role: string) {
  return ADMIN_ROLES.has(role);
}
