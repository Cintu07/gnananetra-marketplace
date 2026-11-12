import {
  BarChart3,
  Boxes,
  BellRing,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CountKey = "orders_to_ship" | "inquiries_new" | "reviews_pending" | "low_stock" | "stock_alerts" | "sellers_pending";

export type NavItem = {
  label: string;
  path: string; // relative to the admin base, "" = the dashboard
  icon: LucideIcon;
  countKey?: CountKey;
  keywords?: string;
  ownerOnly?: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

// The structure of the admin, grouped the way the shop is run day to day.
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "", icon: LayoutDashboard, keywords: "home overview today sales" },
      { label: "Orders", path: "/orders", icon: ShoppingBag, countKey: "orders_to_ship", keywords: "pack ship invoice delivery cod refund" },
      { label: "Products", path: "/products", icon: Package, keywords: "catalogue price add edit" },
      { label: "Inventory", path: "/inventory", icon: Boxes, countKey: "low_stock", keywords: "stock units count quantity" },
      { label: "Categories", path: "/categories", icon: FolderTree, keywords: "departments collections menu" },
      { label: "Brands", path: "/brands", icon: Tags, keywords: "manufacturer hp epson acer" },
      { label: "Customers", path: "/customers", icon: Users, keywords: "crm buyers people export" },
      { label: "Sellers", path: "/sellers", icon: Store, countKey: "sellers_pending", keywords: "marketplace vendors approve commission payout onboarding" },
    ],
  },
  {
    title: "Sales and service",
    items: [
      { label: "Coupons", path: "/coupons", icon: Ticket, keywords: "discount codes offers" },
      { label: "Inquiries", path: "/inquiries", icon: MessageSquare, countKey: "inquiries_new", keywords: "contact messages bulk quote" },
      { label: "Reviews", path: "/reviews", icon: Star, countKey: "reviews_pending", keywords: "moderate approve ratings" },
      { label: "Stock alerts", path: "/stock-alerts", icon: BellRing, countKey: "stock_alerts", keywords: "back in stock notify waiting" },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Homepage banners", path: "/banners", icon: ImageIcon, keywords: "hero slider promo carousel" },
      { label: "Pages", path: "/pages", icon: FileText, keywords: "about privacy terms faq policy content" },
      { label: "Settings", path: "/settings", icon: Settings, keywords: "store shipping payment cod address phone seo", ownerOnly: true },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", path: "/reports", icon: BarChart3, keywords: "revenue sales charts analytics best sellers" },
      { label: "Activity log", path: "/activity", icon: ScrollText, keywords: "audit history who changed" },
      { label: "Team", path: "/team", icon: ShieldCheck, keywords: "staff admins users access", ownerOnly: true },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function isActivePath(pathname: string, base: string, item: NavItem) {
  const full = `${base}${item.path}`;
  return item.path === "" ? pathname === full : pathname === full || pathname.startsWith(`${full}/`);
}
