"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";

type State = { message?: string };

async function submit(_prev: State, formData: FormData): Promise<State> {
  const result = await requestPasswordReset(formData);
  return result ?? {};
}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(submit, {});

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        {state.message ? (
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">{state.message}</p>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/login" className="font-medium underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
