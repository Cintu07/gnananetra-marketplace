import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="wrap py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Set a new password</h1>
        {token ? (
          <div className="mt-6">
            <ResetForm token={token} />
          </div>
        ) : (
          <p className="mt-3 text-[14.5px] text-muted">
            This link is incomplete.{" "}
            <Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
              Ask for a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
