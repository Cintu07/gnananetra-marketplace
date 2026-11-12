import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./shop.css";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import Toaster from "@/components/shop/Toaster";
import TopProgress from "@/components/shop/TopProgress";
import MobileTabBar from "@/components/shop/MobileTabBar";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { seo, store } = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: `%s | ${store.name}` },
    description: seo.description,
    openGraph: { type: "website", siteName: store.name, locale: "en_IN", images: ["/brand/logo.png"] },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { themeColor: "#0b1324", viewportFit: "cover" };

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <Suspense>
          <TopProgress />
        </Suspense>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileTabBar signedIn={Boolean(session)} />
        <CartDrawer />
        <Toaster />
      </body>
    </html>
  );
}
