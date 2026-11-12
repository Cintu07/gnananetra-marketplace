import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/login-form";
import Logo from "@/components/shop/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLogin() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-[380px] rounded-xl bg-card p-7 shadow-[0px_1px_2px_0px_rgba(24,24,27,0.06),0px_0px_0px_1px_#E7E6E2]">
        <Logo size={40} />
        <h1 className="mt-6 text-[18px]">Admin console</h1>
        <p className="mt-2 text-subtle">Sign in with your staff account.</p>
        {user && !isAdminRole(user.role) && (
          <p className="mt-4 rounded-lg bg-[#FEF2F2] p-3 text-[13px] text-[#B91C1C]">You&apos;re signed in as a customer ({user.email}). Sign in with a staff account to continue.</p>
        )}
        <AdminLoginForm />
      </div>
    </main>
  );
}
