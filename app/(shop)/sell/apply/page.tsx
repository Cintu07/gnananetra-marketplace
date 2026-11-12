import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ApplyForm from "@/components/seller/ApplyForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Apply to sell", alternates: { canonical: "/sell/apply" } };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (user?.role === "seller") redirect("/seller");
  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      <p className="eyebrow mb-1.5">Sell on Gnananetra</p>
      <h1 className="section-title">Open your store</h1>
      <p className="mt-2 text-[15px] text-muted">
        Takes about five minutes. Already have a seller account? <Link href="/login?next=/seller" className="font-semibold text-brand-700">Sign in</Link>.
      </p>
      <ApplyForm />
    </div>
  );
}
