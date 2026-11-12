"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rupees } from "@/lib/money";

export default function RetryPayment({
  number,
  accessKey,
  total,
  razorpayOrderId,
  keyId,
  customer,
}: {
  number: string;
  accessKey: string;
  total: number;
  razorpayOrderId: string | null;
  keyId: string | null;
  customer: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(payload: Record<string, string>) {
    const res = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, key: accessKey, ...payload }) });
    return (await res.json()) as { ok?: boolean; error?: string };
  }

  async function pay() {
    setError(null);
    setBusy(true);
    if (!keyId) {
      const v = await verify({ test: "success" });
      if (v.ok) router.refresh();
      else setError(v.error ?? "Test payment failed");
      setBusy(false);
      return;
    }
    if (!window.Razorpay) {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
    }
    if (!window.Razorpay || !razorpayOrderId) {
      setError("Could not open the payment window. Please try again.");
      setBusy(false);
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount: total,
      currency: "INR",
      name: "Gnananetra",
      description: `Order ${number}`,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: "#C9420C" },
      handler: async (r: Record<string, string>) => {
        const v = await verify(r);
        if (v.ok) router.refresh();
        else setError(v.error ?? "We could not confirm the payment.");
        setBusy(false);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.open();
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={pay} disabled={busy} className="btn-primary">
        {busy ? "Opening…" : `${keyId ? "Pay" : "Simulate test payment of"} ${rupees(total)}`}
      </button>
      {error && <p className="mt-2 text-[13.5px] text-danger">{error}</p>}
    </div>
  );
}
