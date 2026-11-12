// Everything the owner can change from Admin > Settings, with sensible defaults.
// Stored in the `settings` table as one row per section (key = section name).

export type StoreSettings = {
  name: string;
  legalName: string;
  tagline: string;
  phone: string;
  altPhone: string;
  whatsapp: string;
  email: string;
  supportHours: string;
  gstin: string;
  storeAddress: string;
  headOfficeAddress: string;
  mapQuery: string;
  social: { facebook: string; instagram: string; youtube: string; linkedin: string; x: string };
};

export type ShippingSettings = {
  freeShippingMin: number; // paise; orders at or above ship free
  flatFee: number; // paise; charged below the free threshold
  dispatchDays: string;
  serviceNote: string;
};

export type PaymentSettings = {
  onlineEnabled: boolean;
  codEnabled: boolean;
  codFee: number; // paise
  codMaxOrder: number; // paise, 0 = no limit
};

export type HomeSettings = {
  announcement: string;
  announcementHref: string;
  showDeals: boolean;
  featuredCategorySlugs: string[];
  trustBadges: { title: string; text: string }[];
};

export type SeoSettings = { title: string; description: string };

export type InvoiceSettings = { terms: string; signatory: string };

export type Settings = {
  store: StoreSettings;
  shipping: ShippingSettings;
  payments: PaymentSettings;
  home: HomeSettings;
  seo: SeoSettings;
  invoice: InvoiceSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  store: {
    name: "Gnananetra",
    legalName: "Gnananetra Industries Private Limited",
    tagline: "Printers, computers and office technology, delivered across India",
    phone: "+91 83414 17766",
    altPhone: "+91 91548 07754",
    whatsapp: "918341417766",
    email: "sales@gnananetra.com",
    supportHours: "Mon to Sat, 10 am to 7 pm",
    gstin: "",
    storeAddress:
      "D.No 76-15-23A, Ring Road, near Varun Motors Maruthi Suzuki Showroom, Bhavanipuram, Vijayawada, NTR District, Andhra Pradesh 520012",
    headOfficeAddress:
      "12-1745 Sundharaiah Nagar, Revenue Ward No. 12, Tadepalli, Amaravati, Guntur District, Andhra Pradesh 522501",
    mapQuery: "Gnananetra Industries, Bhavanipuram, Vijayawada 520012",
    social: { facebook: "", instagram: "", youtube: "", linkedin: "", x: "" },
  },
  shipping: {
    freeShippingMin: 99900,
    flatFee: 0,
    dispatchDays: "1 to 3 working days",
    serviceNote: "Delivered across India through trusted courier partners.",
  },
  payments: { onlineEnabled: true, codEnabled: true, codFee: 0, codMaxOrder: 0 },
  home: {
    announcement: "Free delivery on orders above ₹999. GST invoice with every order.",
    announcementHref: "/shop",
    showDeals: true,
    featuredCategorySlugs: ["printer", "laptops", "desktops", "air-conditioner", "line-interactive-ups"],
    trustBadges: [
      { title: "Free delivery", text: "On orders above ₹999" },
      { title: "Easy replacement", text: "Report damage within 48 hours" },
      { title: "Secure payment", text: "UPI, cards, net banking" },
      { title: "GST invoice", text: "Claim input tax credit" },
    ],
  },
  seo: {
    title: "Gnananetra | Printers, laptops, desktops and office technology",
    description:
      "Buy printers, laptops, desktops, all-in-one PCs, UPS, air conditioners and office equipment from Gnananetra Industries, Vijayawada. Genuine products, GST invoice, delivery across India.",
  },
  invoice: {
    terms: "Goods once sold are covered by the manufacturer's warranty. Subject to Vijayawada jurisdiction.",
    signatory: "For Gnananetra Industries Private Limited",
  },
};

export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>;
  for (const row of rows) {
    if (row.key in out && row.value && typeof row.value === "object") {
      out[row.key] = { ...out[row.key], ...(row.value as Record<string, unknown>) };
    }
  }
  return out as unknown as Settings;
}
