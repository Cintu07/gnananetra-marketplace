import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BadgeCheck, Package, Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginRegister } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const { next, tab } = await searchParams;
  const dest = safeNext(next, "/account");
  if (await getCurrentUser()) redirect(dest);
  return (
    <div className="wrap py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-surface ring-1 ring-line md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-night p-10 text-white md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_100%_0%,rgb(249_94_6/0.35),transparent_60%)]" aria-hidden />
          <div className="relative">
            <span className="grid size-16 place-items-center rounded-2xl bg-white p-2">
              <Image src="/brand/emblem.png" alt="" width={256} height={256} />
            </span>
            <h1 className="mt-6 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Welcome to Gnananetra</h1>
            <p className="mt-2 text-[15px] text-white/70">Office technology, delivered with care.</p>
          </div>
          <ul className="relative space-y-3 text-[14.5px] text-white/85">
            <li className="flex items-center gap-3">
              <Package className="size-5 text-brand" aria-hidden /> Track every order in one place
            </li>
            <li className="flex items-center gap-3">
              <BadgeCheck className="size-5 text-brand" aria-hidden /> Saved addresses and GST details
            </li>
            <li className="flex items-center gap-3">
              <Heart className="size-5 text-brand" aria-hidden /> Wishlist and faster checkout
            </li>
          </ul>
        </div>
        <div className="p-6 sm:p-10">
          <h1 className="mb-6 text-[24px] font-extrabold tracking-[-0.02em] md:hidden">Welcome</h1>
          <LoginRegister next={dest} initial={tab === "register" ? "register" : "login"} />
        </div>
      </div>
    </div>
  );
}
