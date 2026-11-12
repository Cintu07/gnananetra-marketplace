export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "on_hold",
  "cancelled",
  "refunded",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  processing: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  on_hold: "On hold",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Payment failed",
};

export const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Online payment",
  cod: "Cash on delivery",
};

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function formatDate(iso: string | Date | null | undefined, withTime = false): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

// Catalogue images are product cut outs on white; anything else (an uploaded or generated photo) fills its card.
export const isPhoto = (src: string) => !src.startsWith("/catalog/");
