import type { Metadata } from "next";
import TrackForm from "@/components/shop/TrackForm";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="wrap py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Track your order</h1>
        <p className="mt-2 mb-6 text-[14.5px] text-muted">Enter the order number from your confirmation email and the email or mobile number you ordered with.</p>
        <TrackForm />
      </div>
    </div>
  );
}
