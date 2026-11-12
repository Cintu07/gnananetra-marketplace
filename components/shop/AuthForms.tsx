"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { changePassword, forgotPassword, login, register, resetPassword, updateProfile, type FormState } from "@/app/(shop)/actions";

function Password({ id, name, label, autoComplete, minLength }: { id: string; name: string; label: string; autoComplete: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} minLength={minLength} className="field pr-12" />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-canvas">
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function Status({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-danger-50 p-3 text-[14px] font-medium text-danger">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="rounded-xl bg-success-50 p-3 text-[14px] font-medium text-success">
        {state.message}
      </p>
    );
  return null;
}

export function LoginRegister({ next, initial = "login" }: { next: string; initial?: "login" | "register" }) {
  const [tab, setTab] = useState(initial);
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [regState, regAction, regPending] = useActionState(register, null);

  return (
    <div>
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-canvas p-1 ring-1 ring-line">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full py-2.5 text-[14px] font-bold transition ${tab === t ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
          >
            {t === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="l-email" className="label">
              Email
            </label>
            <input id="l-email" name="email" type="email" required autoComplete="email" defaultValue={loginState?.fields?.email} className="field" />
          </div>
          <Password id="l-pass" name="password" label="Password" autoComplete="current-password" />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="inline-flex min-h-10 items-center text-[13.5px] font-semibold text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Status state={loginState} />
          <button disabled={loginPending} className="btn-primary h-12 w-full">
            {loginPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form action={regAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="r-name" className="label">
              Full name
            </label>
            <input id="r-name" name="name" required autoComplete="name" defaultValue={regState?.fields?.name} className="field" />
          </div>
          <div>
            <label htmlFor="r-email" className="label">
              Email
            </label>
            <input id="r-email" name="email" type="email" required autoComplete="email" defaultValue={regState?.fields?.email} className="field" />
          </div>
          <div>
            <label htmlFor="r-phone" className="label">
              Mobile <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="r-phone" name="phone" type="tel" autoComplete="tel" className="field" />
          </div>
          <Password id="r-pass" name="password" label="Password (8+ characters)" autoComplete="new-password" minLength={8} />
          <Status state={regState} />
          <button disabled={regPending} className="btn-primary h-12 w-full">
            {regPending ? "Creating account…" : "Create account"}
          </button>
          <p className="text-[12.5px] text-muted">Bought from us before as a guest? Use the same email and your past orders will appear in your account.</p>
        </form>
      )}
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPassword, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="f-email" className="label">
          Email
        </label>
        <input id="f-email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <Status state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Password id="n-pass" name="password" label="New password (8+ characters)" autoComplete="new-password" minLength={8} />
      <Status state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">
        {pending ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className="label">
            Name
          </label>
          <input id="p-name" name="name" defaultValue={name} required className="field" />
        </div>
        <div>
          <label htmlFor="p-phone" className="label">
            Mobile
          </label>
          <input id="p-phone" name="phone" defaultValue={phone} className="field" />
        </div>
      </div>
      <Status state={state} />
      <button disabled={pending} className="btn-dark btn-sm">
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {hasPassword ? <Password id="c-cur" name="current" label="Current password" autoComplete="current-password" /> : <input type="hidden" name="current" value="" />}
        <Password id="c-new" name="password" label="New password" autoComplete="new-password" minLength={8} />
      </div>
      <Status state={state} />
      <button disabled={pending} className="btn-dark btn-sm">
        {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </button>
    </form>
  );
}
