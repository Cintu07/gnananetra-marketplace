import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { razorpayLive } from "@/lib/razorpay";
import CheckoutForm from "@/components/shop/CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const addresses = user
    ? await db.select().from(s.addresses).where(eq(s.addresses.userId, user.id)).orderBy(desc(s.addresses.isDefault), asc(s.addresses.id))
    : [];
  return (
    <CheckoutForm
      user={user ? { name: user.name, email: user.email ?? "", phone: user.phone ?? "" } : null}
      addresses={addresses.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone ?? "",
        company: a.company ?? "",
        gstin: a.gstin ?? "",
        line1: a.line1,
        line2: a.line2 ?? "",
        landmark: a.landmark ?? "",
        city: a.city,
        state: a.state,
        pincode: a.pincode,
      }))}
      testMode={!razorpayLive()}
      storeName={settings.store.name}
    />
  );
}
