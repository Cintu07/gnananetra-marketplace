import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ExternalLink } from "lucide-react";
import "@/app/(shop)/shop.css";
import Logo from "@/components/shop/Logo";
import SellerNav from "@/components/seller/SellerNav";
import { requireSeller } from "@/lib/seller-auth";
import { db, schema as s } from "@/lib/db";
import { and, count, eq, inArray } from "drizzle-orm";
import { logout } from "@/app/(shop)/actions";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = { title: { default: "Seller Centre", template: "%s | Seller Centre" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#0b1324", viewportFit: "cover" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: string; text: string }> = {
  pending: { tone: "bg-warn-50 text-warn", text: "Your application is being reviewed. You can set up your store and add products now; they go on sale once the team approves you." },
  rejected: { tone: "bg-danger-50 text-danger", text: "Your application was not approved." },
  suspended: { tone: "bg-danger-50 text-danger", text: "Your store is suspended, so your products are hidden. Contact the team to sort it out." },
};

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { seller } = await requireSeller();
  const [{ n: toShip }] = await db
    .select({ n: count() })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), eq(s.orderItems.fulfilment, "pending"), inArray(s.orders.status, ["processing", "packed"])));
  const banner = STATUS[seller.status];
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-dvh">
        <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--color-line)]">
          <div className="wrap flex items-center gap-3 py-2.5">
            <Link href="/seller" aria-label="Seller Centre home" className="flex min-h-11 shrink-0 items-center">
              <Logo size={34} />
            </Link>
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-bold tracking-[0.14em] text-brand-800 uppercase sm:inline">Seller Centre</span>
            <div className="ml-auto flex items-center gap-1.5">
              {seller.status === "approved" && (
                <Link href={`/store/${seller.slug}`} className="btn-outline btn-sm hidden sm:inline-flex">
                  View my store <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              )}
              <form action={logout}>
                <button className="btn-ghost btn-sm">Sign out</button>
              </form>
            </div>
          </div>
          <div className="wrap pb-2.5">
            <SellerNav toShip={toShip} />
          </div>
        </header>
        {banner && (
          <div className={`${banner.tone} text-[13.5px] font-medium`}>
            <p className="wrap py-2.5">
              {banner.text}
              {seller.rejectionReason && ` Reason: ${seller.rejectionReason}`}
            </p>
          </div>
        )}
        <main className="wrap py-7 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
