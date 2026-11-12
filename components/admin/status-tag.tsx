import Tag, { type TagTone } from "@/components/admin/ui/tag";
import { ORDER_STATUS_LABEL } from "@/lib/site";

const ORDER_TONE: Record<string, TagTone> = {
  pending: "amber",
  processing: "blue",
  packed: "purple",
  shipped: "teal",
  delivered: "green",
  on_hold: "orange",
  cancelled: "neutral",
  refunded: "red",
  failed: "neutral",
};

const PAYMENT_TONE: Record<string, TagTone> = { paid: "green", unpaid: "amber", refunded: "red", partially_refunded: "orange", failed: "red" };

const INQUIRY_TONE: Record<string, TagTone> = { new: "blue", in_progress: "amber", resolved: "green", spam: "neutral" };

export function OrderStatusTag({ status }: { status: string }) {
  return <Tag tone={ORDER_TONE[status] ?? "neutral"}>{ORDER_STATUS_LABEL[status] ?? status}</Tag>;
}

export function PaymentTag({ status, method, orderStatus }: { status: string; method: string; orderStatus?: string }) {
  if (status === "unpaid" && orderStatus && ["cancelled", "failed"].includes(orderStatus)) return <Tag tone="neutral">not paid</Tag>;
  const label = status === "unpaid" && method === "cod" ? "COD · to collect" : status.replace("_", " ");
  return <Tag tone={PAYMENT_TONE[status] ?? "neutral"}>{label}</Tag>;
}

export function InquiryStatusTag({ status }: { status: string }) {
  return <Tag tone={INQUIRY_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</Tag>;
}

export function ActiveTag({ active, on = "live", off = "hidden" }: { active: boolean; on?: string; off?: string }) {
  return <Tag tone={active ? "green" : "neutral"}>{active ? on : off}</Tag>;
}

export function StockTag({ status, qty, low }: { status: string; qty: number | null; low?: number }) {
  if (status === "out_of_stock") return <Tag tone="red">out of stock</Tag>;
  if (status === "preorder") return <Tag tone="purple">pre-order</Tag>;
  if (qty !== null && qty <= (low ?? 3)) return <Tag tone="amber">{qty} left</Tag>;
  return <Tag tone="green">{qty !== null ? `${qty} in stock` : "in stock"}</Tag>;
}

export function ProductStatusTag({ status }: { status: string }) {
  return <Tag tone={status === "published" ? "green" : status === "draft" ? "amber" : "neutral"}>{status}</Tag>;
}
