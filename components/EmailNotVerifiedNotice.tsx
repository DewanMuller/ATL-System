"use client";

import { useActionState } from "react";
import { resendVerificationEmail } from "@/app/actions/auth";

type State = { message?: string; error?: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required shape for useActionState's reducer-like action
async function submit(_prev: State, _formData: FormData): Promise<State> {
  const result = await resendVerificationEmail();
  return result ?? {};
}

export function EmailNotVerifiedNotice() {
  const [state, formAction, pending] = useActionState<State, FormData>(submit, {});

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Verify your email to continue
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        We sent a verification link to your email address when you signed
        up. Click it to unlock your account.
      </p>

      {(state.message || state.error) && (
        <p
          className={`text-sm ${state.error ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-300"}`}
        >
          {state.error ?? state.message}
        </p>
      )}

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {pending ? "Sending..." : "Resend verification email"}
        </button>
      </form>
    </div>
  );
}
