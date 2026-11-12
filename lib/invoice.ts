import { splitGst } from "@/lib/money";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
}

/** 12345678 paise -> "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees and Seventy Eight Paise Only" */
export function amountInWords(paise: number) {
  let rupees = Math.floor(paise / 100);
  const p = paise % 100;
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rupees) parts.push(threeDigits(rupees));
  const words = parts.join(" ") || "Zero";
  return `${words} Rupees${p ? ` and ${twoDigits(p)} Paise` : ""} Only`;
}

type Line = { name: string; hsn: string | null; qty: number; unitPrice: number; lineTotal: number; gstRate: number };

/** Prices are GST inclusive. The order discount is spread over lines by value so the taxable values stay right. */
export function invoiceLines(items: Line[], discount: number, shippingFee: number, codFee: number, intraState: boolean) {
  const gross = items.reduce((n, i) => n + i.lineTotal, 0) || 1;
  let left = discount;
  const rows = items.map((i, idx) => {
    const share = idx === items.length - 1 ? left : Math.round((discount * i.lineTotal) / gross);
    left -= share;
    const value = i.lineTotal - share;
    const [taxable, tax] = splitGst(value, i.gstRate);
    return { ...i, value, taxable, tax, cgst: intraState ? Math.floor(tax / 2) : 0, sgst: intraState ? tax - Math.floor(tax / 2) : 0, igst: intraState ? 0 : tax };
  });
  const extras = shippingFee + codFee;
  if (extras > 0) {
    const [taxable, tax] = splitGst(extras, 18);
    rows.push({
      name: codFee && shippingFee ? "Delivery and COD charges" : codFee ? "Cash on delivery charges" : "Delivery charges",
      hsn: "9965",
      qty: 1,
      unitPrice: extras,
      lineTotal: extras,
      gstRate: 18,
      value: extras,
      taxable,
      tax,
      cgst: intraState ? Math.floor(tax / 2) : 0,
      sgst: intraState ? tax - Math.floor(tax / 2) : 0,
      igst: intraState ? 0 : tax,
    });
  }
  const sum = (k: "taxable" | "tax" | "cgst" | "sgst" | "igst" | "value") => rows.reduce((n, r) => n + r[k], 0);
  return { rows, taxable: sum("taxable"), tax: sum("tax"), cgst: sum("cgst"), sgst: sum("sgst"), igst: sum("igst"), total: sum("value") };
}
