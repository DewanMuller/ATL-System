"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function PeriodSelect({
  periods,
  selected,
}: {
  periods: { key: string; label: string }[];
  selected?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (periods.length === 0) return null;

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
    >
      {periods.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
