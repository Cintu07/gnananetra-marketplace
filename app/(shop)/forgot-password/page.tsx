import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="wrap py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Forgot your password?</h1>
        <p className="mt-2 mb-6 text-[14.5px] text-muted">Enter your email and we&apos;ll send you a link to set a new one. Customers from our old website can use this to set a password for the first time.</p>
        <ForgotForm />
        <p className="mt-6 text-center text-[14px]">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
