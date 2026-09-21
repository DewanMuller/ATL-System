import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/actions/departments";
import { SubmitButton } from "@/components/FormFields";

export function DepartmentManager({
  departments,
}: {
  departments: { id: string; code: string; name: string }[];
}) {
  return (
    <details className="rounded-xl border border-dashed border-black/15 p-4 dark:border-white/15">
      <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Manage departments
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {departments.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <form action={updateDepartment} className="flex flex-1 gap-2">
              <input type="hidden" name="departmentId" value={d.id} />
              <input
                name="code"
                defaultValue={d.code}
                className="w-16 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
              />
              <input
                name="name"
                defaultValue={d.name}
                className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
              />
              <button
                type="submit"
                className="rounded-md border border-black/10 px-2 py-1 text-xs dark:border-white/10"
              >
                Save
              </button>
            </form>
            <form action={deleteDepartment.bind(null, d.id)}>
              <button
                type="submit"
                className="text-xs text-zinc-400 hover:text-red-600"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
        <form action={createDepartment} className="flex gap-2">
          <input
            name="code"
            placeholder="Code (e.g. F)"
            required
            className="w-24 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
          />
          <input
            name="name"
            placeholder="Name (e.g. Finance)"
            required
            className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
          />
          <SubmitButton>Add department</SubmitButton>
        </form>
      </div>
    </details>
  );
}
