"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        We&apos;ve been notified and are looking into it.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  );
}
