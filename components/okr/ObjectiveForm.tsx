import { createObjective, updateObjective } from "@/app/actions/okr";
import { TextField, SubmitButton } from "@/components/FormFields";
import type { MemberOption } from "@/lib/members";

export function ObjectiveForm({
  mode,
  objectiveId,
  defaultValues,
  members,
  departments,
  alignmentOptions,
}: {
  mode: "create" | "edit";
  objectiveId?: string;
  defaultValues?: {
    code: string | null;
    title: string;
    leadUserId: string;
    contributorIds: string[];
    weightingPercent: number;
    periodType: string;
    periodValue: string;
    dueDate: string;
    alignedToObjectiveId: string | null;
    departmentId: string | null;
    isTopCompanyOkr: boolean;
    isTopDepartmentOkr: boolean;
  };
  members: MemberOption[];
  departments: { id: string; code: string; name: string }[];
  alignmentOptions: { id: string; title: string }[];
}) {
  const action = mode === "create" ? createObjective : updateObjective;
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {mode === "edit" && (
        <input type="hidden" name="objectiveId" value={objectiveId} />
      )}
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <TextField
          label="Code"
          name="code"
          placeholder="e.g. F2, C10, O8A"
          defaultValue={defaultValues?.code ?? undefined}
        />
        <div className="col-span-2">
          <TextField
            label="Title"
            name="title"
            defaultValue={defaultValues?.title}
            required
            full
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs text-zinc-400">
          Keep it short and scannable — around 70 characters or less reads
          best. Describe the outcome you want, not a number — save targets
          like &quot;30%&quot; or &quot;R500k&quot; for the Key Results below.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Department
        </span>
        <select
          name="departmentId"
          defaultValue={defaultValues?.departmentId ?? ""}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-4 pb-2 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="isTopCompanyOkr"
            defaultChecked={defaultValues?.isTopCompanyOkr}
          />
          <span className="text-zinc-700 dark:text-zinc-300">Top 3 Company OKR</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="isTopDepartmentOkr"
            defaultChecked={defaultValues?.isTopDepartmentOkr}
          />
          <span className="text-zinc-700 dark:text-zinc-300">Top 3 Department OKR</span>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Lead
        </span>
        <select
          name="leadUserId"
          defaultValue={defaultValues?.leadUserId}
          required
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="">Select a lead</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name || m.user.email}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Contributors
        </span>
        <select
          name="contributorIds"
          multiple
          defaultValue={defaultValues?.contributorIds}
          className="h-24 rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name || m.user.email}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label="Weighting %"
        name="weightingPercent"
        type="number"
        step="any"
        defaultValue={defaultValues?.weightingPercent}
        required
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Period type
        </span>
        <select
          name="periodType"
          defaultValue={defaultValues?.periodType ?? "QUARTER"}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="QUARTER">Quarter</option>
          <option value="YEAR">Year</option>
        </select>
      </label>
      <TextField
        label="Period"
        name="periodValue"
        placeholder="e.g. 2026-Q1 or 2026"
        defaultValue={defaultValues?.periodValue}
        required
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
          Aligned to
        </span>
        <select
          name="alignedToObjectiveId"
          defaultValue={defaultValues?.alignedToObjectiveId ?? ""}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="">None (top-level)</option>
          {alignmentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton full>
        {mode === "create" ? "Add objective" : "Save objective"}
      </SubmitButton>
    </form>
  );
}
