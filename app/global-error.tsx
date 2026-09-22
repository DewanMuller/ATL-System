"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ve been notified and are looking into it. Try refreshing
          the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
