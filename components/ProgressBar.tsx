export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-50"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
