import type { MeasureType } from "@prisma/client";
import { createKeyResult, updateKeyResult } from "@/app/actions/okr";
import { TextField, SubmitButton } from "@/components/FormFields";
import { MeasureFields } from "@/components/okr/MeasureFields";
import type { MemberOption } from "@/lib/members";

export function KeyResultForm({
  mode,
  objectiveId,
  keyResultId,
  defaultValues,
  members,
}: {
  mode: "create" | "edit";
  objectiveId?: string;
  keyResultId?: string;
  defaultValues?: {
    metric: string;
    target: string;
    responsibleUserId: string;
    measureType?: MeasureType;
    targetValue?: number | null;
    startValue?: number | null;
    unit?: string | null;
  };
  members: MemberOption[];
}) {
  const action = mode === "create" ? createKeyResult : updateKeyResult;
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {mode === "create" ? (
        <input type="hidden" name="objectiveId" value={objectiveId} />
      ) : (
        <input type="hidden" name="keyResultId" value={keyResultId} />
      )}
      <TextField
        label="Metric"
        name="metric"
        defaultValue={defaultValues?.metric}
        required
        full
      />
      <TextField
        label="Target"
        name="target"
        placeholder="e.g. R500k, 35%, 4.5x"
        defaultValue={defaultValues?.target}
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
      <MeasureFields
        defaultValues={{
          measureType: defaultValues?.measureType,
          targetValue: defaultValues?.targetValue,
          startValue: defaultValues?.startValue,
          unit: defaultValues?.unit,
        }}
      />
      <SubmitButton>{mode === "create" ? "Add KR" : "Save"}</SubmitButton>
    </form>
  );
}
