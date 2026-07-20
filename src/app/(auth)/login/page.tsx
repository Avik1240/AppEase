"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    null
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card reveal w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Log in
        </h1>
        <p className="mt-1 text-sm text-smoke">Welcome back to AppEase.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
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
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-smoke">
          No account?{" "}
          <Link href="/signup" className="font-medium text-brass underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
