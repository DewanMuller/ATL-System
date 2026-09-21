"use client";

import { useState } from "react";

export function OutcomeEditor({
  action,
  idField,
  id,
  outcomePercent,
  comments,
}: {
  action: (formData: FormData) => Promise<void> | void;
  idField: string;
  id: string;
  outcomePercent: number | null;
  comments: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
      >
        Update
      </button>
    );
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    // The action calls refresh() (next/cache) server-side, so the fresh
    // data comes back in this same round trip — no client router.refresh()
    // follow-up needed (that raced with the update showing stale values).
    await action(formData);
    setPending(false);
    setEditing(false);
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name={idField} value={id} />
      <input
        type="number"
        step="any"
        min={0}
        max={100}
        name="outcomePercent"
        defaultValue={outcomePercent ?? undefined}
        placeholder="%"
        className="w-14 rounded-md border border-black/10 bg-white px-1.5 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <input
        type="text"
        name="comments"
        defaultValue={comments ?? undefined}
        placeholder="Comments"
        className="min-w-[8rem] flex-1 rounded-md border border-black/10 bg-white px-1.5 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Cancel
      </button>
    </form>
  );
}
