import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const [row] = await db.select({ passwordHash: s.users.passwordHash }).from(s.users).where(eq(s.users.id, user.id));
  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold">Your details</h2>
        <p className="mb-5 text-[13.5px] text-muted">Signed in as {user.email}</p>
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="mb-5 text-[17px] font-extrabold">{row?.passwordHash ? "Change password" : "Set a password"}</h2>
        <PasswordForm hasPassword={Boolean(row?.passwordHash)} />
      </section>
    </div>
  );
}
