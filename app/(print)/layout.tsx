import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../(shop)/shop.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

// Bare layout for printable documents: no header, footer or cart.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="bg-canvas print:bg-white">{children}</body>
    </html>
  );
}
