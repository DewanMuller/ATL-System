import type { MeasureType } from "@prisma/client";
import { createInitiative, updateInitiative } from "@/app/actions/okr";
import { TextField, SubmitButton } from "@/components/FormFields";
import type { MemberOption } from "@/lib/members";

export function InitiativeForm({
  mode,
  keyResultId,
  initiativeId,
  defaultValues,
  members,
}: {
  mode: "create" | "edit";
  keyResultId?: string;
  initiativeId?: string;
  defaultValues?: {
    name: string;
    dueDate: string;
    responsibleUserId: string;
    measureType?: MeasureType;
    targetValue?: number | null;
    startValue?: number | null;
    unit?: string | null;
  };
  members: MemberOption[];
}) {
  const action = mode === "create" ? createInitiative : updateInitiative;
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {mode === "create" ? (
        <input type="hidden" name="keyResultId" value={keyResultId} />
      ) : (
        <input type="hidden" name="initiativeId" value={initiativeId} />
      )}
      <TextField
        label="Initiative"
        name="name"
        defaultValue={defaultValues?.name}
        required
        full
      />
      <TextField
        label="Due date"
        name="dueDate"
        type="date"
        defaultValue={defaultValues?.dueDate}
        required
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Responsible
        </span>
        <select
          name="responsibleUserId"
          defaultValue={defaultValues?.responsibleUserId}
          required
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="">Select</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name || m.user.email}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Measured as
        </span>
        <select
          name="measureType"
          defaultValue={defaultValues?.measureType ?? "MANUAL"}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="MANUAL">Manual %</option>
          <option value="BINARY">Done / Not done</option>
          <option value="NUMERIC">Numeric target</option>
        </select>
      </label>
      <TextField
        label="Target (numeric only)"
        name="targetValue"
        type="number"
        step="any"
        defaultValue={defaultValues?.targetValue ?? undefined}
      />
      <TextField
        label="Starting value (optional)"
        name="startValue"
        type="number"
        step="any"
        defaultValue={defaultValues?.startValue ?? undefined}
      />
      <TextField
        label="Unit (optional, e.g. tons)"
        name="unit"
        defaultValue={defaultValues?.unit ?? undefined}
      />
      <SubmitButton>{mode === "create" ? "Add" : "Save"}</SubmitButton>
    </form>
  );
}
