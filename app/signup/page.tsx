"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

type SignupState = { error?: string };

async function submitSignup(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const result = await signup(formData);
  return result ?? {};
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    submitSignup,
    {}
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Set up your account
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Work on your business, not just in it.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <Field label="Business name" name="businessName" />
          <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Starting a new business — or joining a teammate&apos;s? If you
            have an invite code, enter it below instead and skip the business
            name.
          </p>
          <Field
            label="Invite code (optional)"
            name="joinCode"
            placeholder="e.g. M7N7825X"
          />
          <Field label="Your name" name="name" />
          <Field label="Email" name="email" type="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            minLength={8}
          />

          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
