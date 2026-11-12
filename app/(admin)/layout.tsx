import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./admin.css";
import { SIDEBAR_WIDTH_SCRIPT } from "@/lib/admin-sidebar";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// The admin console is its own root layout: no storefront header, footer or cart.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Gnananetra Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_WIDTH_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <div className="brand-stripe" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
