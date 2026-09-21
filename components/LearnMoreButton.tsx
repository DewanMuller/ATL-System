"use client";

import { useRef } from "react";
import type { SuiteAtlLink } from "@/lib/suite-data";

export function LearnMoreButton({
  name,
  rhythm,
  description,
  atlLink,
  accentColor,
}: {
  name: string;
  rhythm: string;
  description: string;
  atlLink?: SuiteAtlLink;
  accentColor: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-medium underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
        style={{ color: accentColor }}
      >
        Learn more
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {rhythm}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{name}</h3>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close"
                className="text-xl leading-none text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                &times;
              </button>
            </form>
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
          {atlLink && (
            <a
              href={atlLink.href}
              className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              📊 {atlLink.label}
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}
