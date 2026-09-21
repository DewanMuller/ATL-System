export function FilterPills({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string; count?: number }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {opt.label}
            {opt.count != null && (
              <span className={isActive ? "text-white/70" : "text-zinc-400"}> ({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
