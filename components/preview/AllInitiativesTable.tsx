"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "./Avatar";
import { FilterPills } from "./FilterPills";
import { OutcomeEditor } from "./OutcomeEditor";
import { ragBadgeClasses, ragHex } from "./colors";
import { statusLabel, ragFor, ragLabel } from "./initiativeStatus";
import { updateInitiativeOutcome } from "@/app/actions/okr";

export type FlatInitiative = {
  id: string;
  name: string;
  dueDate: Date;
  outcomePercent: number | null;
  owner: { initials: string; name: string };
  comments: string | null;
  objective: { id: string; code: string | null; title: string };
  keyResultMetric: string;
  department: string;
  canEdit: boolean;
};

type Filter = "ALL" | "ASSIGNED_TO_ME" | "OVERDUE" | "DUE_THIS_MONTH" | "AT_RISK" | "OFF_TRACK";
const ALL = "ALL";

export function AllInitiativesTable({
  initiatives,
  currentUserName,
}: {
  initiatives: FlatInitiative[];
  currentUserName: string;
}) {
  const now = useMemo(() => new Date(), []);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pillar, setPillar] = useState(ALL);
  const [query, setQuery] = useState("");

  const pillarOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of initiatives) counts.set(i.department, (counts.get(i.department) ?? 0) + 1);
    return [
      { value: ALL, label: "All Pillars", count: initiatives.length },
      ...[...counts.entries()].map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [initiatives]);

  function matchesFilter(i: FlatInitiative): boolean {
    switch (filter) {
      case "ALL":
        return true;
      case "ASSIGNED_TO_ME":
        return i.owner.name === currentUserName;
      case "OVERDUE":
        return statusLabel(i, now) === "Overdue";
      case "DUE_THIS_MONTH":
        return (
          i.dueDate.getFullYear() === now.getFullYear() &&
          i.dueDate.getMonth() === now.getMonth() &&
          statusLabel(i, now) !== "Completed"
        );
      case "AT_RISK":
        return ragFor(i, now) === "AMBER";
      case "OFF_TRACK":
        return ragFor(i, now) === "RED" && statusLabel(i, now) !== "Overdue";
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = initiatives.filter((i) => {
    if (pillar !== ALL && i.department !== pillar) return false;
    if (!matchesFilter(i)) return false;
    if (!q) return true;
    return [i.name, i.objective.title, i.keyResultMetric].join(" ").toLowerCase().includes(q);
  });

  const stats = {
    total: initiatives.length,
    completed: initiatives.filter((i) => statusLabel(i, now) === "Completed").length,
    overdue: initiatives.filter((i) => statusLabel(i, now) === "Overdue").length,
    atRisk: initiatives.filter((i) => ragFor(i, now) === "AMBER").length,
    offTrack: initiatives.filter((i) => ragFor(i, now) === "RED" && statusLabel(i, now) !== "Overdue").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["Total", stats.total, "text-zinc-700 dark:text-zinc-300"],
          ["Completed", stats.completed, "text-green-700 dark:text-green-400"],
          ["Overdue", stats.overdue, "text-red-700 dark:text-red-400"],
          ["At Risk", stats.atRisk, "text-amber-700 dark:text-amber-400"],
          ["Off Track", stats.offTrack, "text-red-700 dark:text-red-400"],
        ].map(([label, value, cls]) => (
          <span
            key={label as string}
            className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-xs dark:border-white/10 dark:bg-zinc-950"
          >
            <span className={`font-semibold ${cls}`}>{value}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills
            options={[
              { value: "ALL", label: "All" },
              { value: "ASSIGNED_TO_ME", label: "Assigned to Me" },
              { value: "OVERDUE", label: "Overdue" },
              { value: "DUE_THIS_MONTH", label: "Due This Month" },
              { value: "AT_RISK", label: "At Risk" },
              { value: "OFF_TRACK", label: "Off Track" },
            ]}
            selected={filter}
            onSelect={(v) => setFilter(v as Filter)}
          />
          <div className="relative lg:w-64">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search initiatives, objectives..."
              className="w-full rounded-md border border-black/10 bg-white py-1.5 pl-7 pr-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>
        <FilterPills options={pillarOptions} selected={pillar} onSelect={setPillar} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-2 py-2 font-medium">Initiative</th>
              <th className="px-2 py-2 font-medium">Objective</th>
              <th className="px-2 py-2 font-medium">Pillar</th>
              <th className="px-2 py-2 font-medium">Owner</th>
              <th className="px-2 py-2 font-medium">Due Date</th>
              <th className="px-2 py-2 font-medium">Progress</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">RAG</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-xs text-zinc-400">
                  No initiatives match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((i) => {
                const status = ragFor(i, now);
                return (
                  <tr key={i.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-2 pr-2 pl-2 text-sm text-zinc-800 dark:text-zinc-200">
                      {i.name}
                      {i.comments && (
                        <p className="mt-0.5 text-xs text-zinc-400">{i.comments}</p>
                      )}
                      {i.canEdit && (
                        <div className="mt-1">
                          <OutcomeEditor
                            action={updateInitiativeOutcome}
                            idField="initiativeId"
                            id={i.id}
                            outcomePercent={i.outcomePercent}
                            comments={i.comments}
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs">
                      <Link
                        href={`/preview/okr-workspace/${i.objective.id}?tab=planner`}
                        className="text-zinc-600 hover:underline dark:text-zinc-300"
                      >
                        {i.objective.code ? `${i.objective.code} — ` : ""}
                        {i.objective.title}
                      </Link>
                      <p className="mt-0.5 text-zinc-400">{i.keyResultMetric}</p>
                    </td>
                    <td className="py-2 pr-2 text-xs text-zinc-500 dark:text-zinc-400">{i.department}</td>
                    <td className="py-2 pr-2">
                      <Avatar initials={i.owner.initials} name={i.owner.name} />
                    </td>
                    <td className="py-2 pr-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {i.dueDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="w-32 py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, i.outcomePercent ?? 0))}%`,
                              backgroundColor: status === "NOT_STARTED" ? "#898781" : ragHex(status),
                            }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {i.outcomePercent != null ? `${Math.round(i.outcomePercent)}%` : "0%"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-xs text-zinc-600 dark:text-zinc-400">{statusLabel(i, now)}</td>
                    <td className="py-2 pr-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
                        {ragLabel(status)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
