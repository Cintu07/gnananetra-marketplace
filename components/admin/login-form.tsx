"use client";

import { useActionState } from "react";
import { login } from "@/app/(shop)/actions";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input } from "@/components/admin/ui/input";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value="/admin" />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-[#FEF2F2] p-3 text-[13px] text-[#B91C1C]">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="h-10 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <a href="/forgot-password" className="caption-style text-center text-subtle hover:text-foreground">
        Forgot your password?
      </a>
    </form>
  );
}
