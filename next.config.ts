import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// `next dev` gets the same Cloudflare bindings as production (D1 database, R2 buckets),
// served locally from .wrangler/state. Does nothing in production builds.
initOpenNextCloudflareForDev();

const config: NextConfig = {
  poweredByHeader: false,
  images: {
    // Catalogue photos are pre-sized WebP (npm run images) and admin uploads are resized in
    // the browser, so no server-side resizing is needed. Works the same on Cloudflare Workers.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "gnananetra.co.in" },
    ],
  },
  // Old WordPress / WooCommerce addresses keep working (and keep their Google ranking).
  async redirects() {
    return [
      { source: "/product-category/:a/:b/:c", destination: "/category/:c", permanent: true },
      { source: "/product-category/:a/:b", destination: "/category/:b", permanent: true },
      { source: "/product-category/:a", destination: "/category/:a", permanent: true },
      { source: "/product-brand/:slug", destination: "/brand/:slug", permanent: true },
      { source: "/brand-:slug", destination: "/brand/:slug", permanent: true },
      { source: "/my-account", destination: "/account", permanent: true },
      { source: "/my-account/:path*", destination: "/account", permanent: true },
      { source: "/shop-cart", destination: "/cart", permanent: true },
      { source: "/shop-checkout", destination: "/checkout", permanent: true },
      { source: "/shop-2", destination: "/shop", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/privacy-policy-2", destination: "/privacy", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/terms-conditions", destination: "/terms", permanent: true },
      { source: "/return-and-refund-policy", destination: "/returns", permanent: true },
      { source: "/order-tracking", destination: "/track", permanent: true },
      { source: "/deals-of-the-day", destination: "/deals", permanent: true },
      { source: "/wishlist-2", destination: "/wishlist", permanent: true },
      { source: "/compare-2", destination: "/compare", permanent: true },
      { source: "/yith-compare", destination: "/compare", permanent: true },
      { source: "/wp-admin", destination: "/admin", permanent: false },
      { source: "/wp-login.php", destination: "/admin/login", permanent: false },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.razorpay.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com https://maps.google.com https://www.google.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    const prod = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\")" },
          ...(prod
            ? [
                { key: "Content-Security-Policy", value: csp },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
              ]
            : []),
        ],
      },
      // private pages never go into shared caches
      { source: "/(admin|account|checkout|order|invoice)/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default config;
