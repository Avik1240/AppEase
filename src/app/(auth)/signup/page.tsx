"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "../actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    null
  );
  const [role, setRole] = useState<"customer" | "salon">("customer");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card reveal w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Create account
        </h1>
        <p className="mt-1 text-sm text-smoke">
          Join AppEase as a customer or a salon.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="role" value={role} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                role === "customer"
                  ? "border-brass bg-brass/10 text-ivory"
                  : "border-white/10 text-smoke hover:border-brass/50"
              }`}
            >
              I’m a customer
            </button>
            <button
              type="button"
              onClick={() => setRole("salon")}
              className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                role === "salon"
                  ? "border-brass bg-brass/10 text-ivory"
                  : "border-white/10 text-smoke hover:border-brass/50"
              }`}
            >
              I run a salon
            </button>
          </div>

          <label className="label-dark">
            {role === "salon" ? "Owner name" : "Full name"}
            <input name="full_name" type="text" required className="input-dark" />
          </label>
          <label className="label-dark">
            Phone number
            <input
              name="phone"
              type="tel"
              required
              pattern="[0-9+ -]{7,15}"
              className="input-dark"
            />
          </label>
          <label className="label-dark">
            Email
            <input name="email" type="email" required className="input-dark" />
          </label>
          <label className="label-dark">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="input-dark"
            />
          </label>

          {state?.error && (
            <p className="rounded-xl border border-wine-soft/40 bg-wine/15 px-3 py-2 text-sm text-wine-soft">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-brass w-full">
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-smoke">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brass underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
