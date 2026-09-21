import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName = "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
}: {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${iconClassName}`}>
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {caption && (
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{caption}</p>
      )}
    </div>
  );
}
