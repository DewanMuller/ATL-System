"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { OkrCard, type OkrCardData } from "./OkrCard";
import { FilterPills } from "./FilterPills";

const ALL = "ALL";

export function OkrWorkspaceGrid({
  okrs,
  basePath = "/preview/okr-workspace",
}: {
  okrs: OkrCardData[];
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const [pillar, setPillar] = useState(ALL);

  const pillarOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const okr of okrs) counts.set(okr.department, (counts.get(okr.department) ?? 0) + 1);
    return [
      { value: ALL, label: "All Pillars", count: okrs.length },
      ...[...counts.entries()].map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [okrs]);

  const q = query.trim().toLowerCase();
  const filtered = okrs.filter((okr) => {
    if (pillar !== ALL && okr.department !== pillar) return false;
    if (!q) return true;
    const haystack = [
      okr.code,
      okr.title,
      ...okr.keyResults.flatMap((kr) => [kr.metric, kr.target]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Pillar
          </p>
          <FilterPills options={pillarOptions} selected={pillar} onSelect={setPillar} />
        </div>
        <div className="relative sm:w-72">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search objectives, KRs, initiatives"
            className="w-full rounded-md border border-black/10 bg-white py-2 pl-8 pr-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((okr) => (
            <OkrCard key={okr.id} okr={okr} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}
