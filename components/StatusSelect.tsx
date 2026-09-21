"use client";

const STYLES: Record<string, string> = {
  GREEN:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  AMBER:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusSelect({
  action,
  idField,
  id,
  status,
}: {
  action: (formData: FormData) => void | Promise<void>;
  idField: string;
  id: string;
  status: string;
}) {
  return (
    <form
      action={action}
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      <input type="hidden" name={idField} value={id} />
      <select
        name="status"
        defaultValue={status}
        className={`cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-semibold ${STYLES[status]}`}
      >
        <option value="GREEN">Green</option>
        <option value="AMBER">Amber</option>
        <option value="RED">Red</option>
      </select>
    </form>
  );
}
