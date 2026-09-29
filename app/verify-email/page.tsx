"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/app/actions/auth";

type State = { error?: string; success?: boolean };

async function submit(_prev: State, formData: FormData): Promise<State> {
  const result = await verifyEmail(formData);
  return result ?? {};
}

function VerifyEmailForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<State, FormData>(submit, {});

  if (!token) {
    return (
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
        This verification link is missing its token. If you still have the
        original email, use the link from there — or log in and use the
        resend option.
      </p>
    );
  }

  if (state.success) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Your email is verified.
        </p>
        <Link
          href="/dashboard"
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Continue to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Verifying..." : "Verify my email"}
      </button>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Confirm your email address to finish setting up your account.
        </p>

        <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading...</p>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
