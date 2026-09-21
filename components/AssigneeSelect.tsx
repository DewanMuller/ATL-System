"use client";

import type { MemberOption } from "@/lib/members";

export function AssigneeSelect({
  action,
  idField,
  id,
  assigneeId,
  members,
  fallbackLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  idField: string;
  id: string;
  assigneeId: string | null;
  members: MemberOption[];
  fallbackLabel?: string | null;
}) {
  return (
    <form
      action={action}
      onChange={(e) => e.currentTarget.requestSubmit()}
      className="w-full"
    >
      <input type="hidden" name={idField} value={id} />
      <select
        name="assigneeId"
        defaultValue={assigneeId ?? ""}
        className="w-full max-w-full truncate rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-zinc-900"
      >
        <option value="">
          {fallbackLabel ? `Unassigned (was: ${fallbackLabel})` : "Unassigned"}
        </option>
        {members.map((m) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name || m.user.email}
          </option>
        ))}
      </select>
    </form>
  );
}
