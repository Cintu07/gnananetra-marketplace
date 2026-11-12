// All money is whole paise. These turn it into text for people.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 4499990 -> "₹44,999.90", 4499900 -> "₹44,999" */
export function rupees(paise: number | null | undefined): string {
  const v = paise ?? 0;
  return "₹" + (v % 100 === 0 ? inr.format(v / 100) : inr2.format(v / 100));
}

/** Always two decimals, for invoices. */
export function rupees2(paise: number | null | undefined): string {
  return "₹" + inr2.format((paise ?? 0) / 100);
}

export function discountPercent(price: number, mrp: number | null | undefined): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** "449999.00" or "4,49,999" typed by a person -> paise. Returns null if not a number. */
export function toPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function fromPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** GST included in an inclusive price: returns [taxable, gst]. */
export function splitGst(inclusive: number, rate: number): [number, number] {
  const taxable = Math.round(inclusive / (1 + rate / 100));
  return [taxable, inclusive - taxable];
}

/** For PDFs: their built-in fonts have no ₹ glyph, so "Rs 25,697". */
export function pdfRupees(paise: number | null | undefined): string {
  return paise === null || paise === undefined ? "" : `Rs ${inr.format(Math.round(paise / 100))}`;
}
