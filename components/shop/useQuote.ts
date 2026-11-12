"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/stores";

export type QuoteLine = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  mrp: number | null;
  qty: number;
  lineTotal: number;
  maxQty: number;
  problem: string | null;
};
export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  discount: number;
  shippingFee: number;
  codFee: number;
  total: number;
  coupon: { code: string; applied: boolean; message: string } | null;
  codAvailable: boolean;
  onlineAvailable: boolean;
  freeShippingGap: number;
  ok: boolean;
};

/** Live server price for the browser cart. Re-runs when the cart, code or payment method changes. */
export function useQuote(items: CartItem[], couponCode: string | null, paymentMethod?: "razorpay" | "cod") {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(items.map((i) => [i.productId, i.qty]));

  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ productId: i.productId, qty: i.qty })), couponCode, paymentMethod }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((q: Quote) => {
        setQuote(q);
        setLoading(false);
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, couponCode, paymentMethod]);

  return { quote, loading };
}
