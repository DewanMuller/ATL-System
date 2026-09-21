import { parsePeriod } from "@/lib/period";
import { objectiveScore } from "@/lib/okr";
import type { TimelineMonth, TimelineRow, TimelineLegendEntry } from "@/components/charts/Timeline";

type UserRef = { id: string; name: string | null; email: string };

function userLabel(u: UserRef) {
  return u.name || u.email;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function periodLabel(periodType: string, periodValue: string) {
  return `${periodValue} (${periodType === "YEAR" ? "Year" : "Quarter"})`;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric" }).format(
    new Date(year, month, 1)
  );
}

export type TimelineObjective = {
  id: string;
  code: string | null;
  title: string;
  periodType: string;
  periodValue: string;
  dueDate: Date | null;
  lead: UserRef;
  keyResults: {
    outcomePercent: number | null;
    initiatives: {
      id: string;
      name: string;
      dueDate: Date;
      responsibleUser: UserRef;
    }[];
  }[];
};

export type TimelineData = {
  months: TimelineMonth[];
  rows: TimelineRow[];
  legend: TimelineLegendEntry[];
  todayLeftPct: number | null;
  unscheduled: TimelineObjective[];
};

// Shared by /timeline and /preview/timeline so the two never drift. Returns
// null when nothing has a recognizable period to plot at all (the caller
// shows its own empty state in that case).
export function buildTimelineData(objectives: TimelineObjective[]): TimelineData | null {
  const scheduled: { objective: TimelineObjective; start: Date; end: Date }[] = [];
  const unscheduled: TimelineObjective[] = [];

  for (const objective of objectives) {
    const range = parsePeriod(objective.periodType, objective.periodValue);
    if (range) {
      // The bar spans from the OKR period's start to the objective's own
      // due date (its actual deadline, which may land before the period's
      // last day) — falling back to the period's end for any objective
      // created before the dueDate field existed.
      scheduled.push({ objective, start: range.start, end: objective.dueDate ?? range.end });
    } else {
      unscheduled.push(objective);
    }
  }

  if (scheduled.length === 0) return null;

  let rangeStart = scheduled.reduce(
    (min, s) => (s.start < min ? s.start : min),
    scheduled[0].start
  );
  let rangeEnd = scheduled.reduce((max, s) => (s.end > max ? s.end : max), scheduled[0].end);

  for (const { objective } of scheduled) {
    for (const kr of objective.keyResults) {
      for (const initiative of kr.initiatives) {
        if (initiative.dueDate < rangeStart) rangeStart = initiative.dueDate;
        if (initiative.dueDate > rangeEnd) rangeEnd = initiative.dueDate;
      }
    }
  }

  // Round the visible window out to full months for a clean grid, with a
  // one-month buffer on each side so edge bars/markers aren't clipped.
  const gridStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1);
  const gridEndExclusive = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 2, 1);
  const totalMs = gridEndExclusive.getTime() - gridStart.getTime();

  const pct = (d: Date) => {
    const raw = ((d.getTime() - gridStart.getTime()) / totalMs) * 100;
    return Math.max(0, Math.min(100, raw));
  };

  const months: TimelineMonth[] = [];
  const cursor = new Date(gridStart);
  while (cursor < gridEndExclusive) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const widthPct = ((monthEnd.getTime() - monthStart.getTime()) / totalMs) * 100;
    months.push({
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: monthLabel(monthStart.getFullYear(), monthStart.getMonth()),
      widthPct,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const leadIds = Array.from(
    new Map(scheduled.map(({ objective }) => [objective.lead.id, objective.lead])).values()
  ).sort((a, b) => userLabel(a).localeCompare(userLabel(b)));
  const colorIndexByLead = new Map(leadIds.map((lead, i) => [lead.id, i]));

  const legend: TimelineLegendEntry[] = leadIds.map((lead) => ({
    label: userLabel(lead),
    colorIndex: colorIndexByLead.get(lead.id)!,
  }));

  const rows: TimelineRow[] = scheduled
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ objective, start, end }) => {
      const score = objectiveScore(objective.keyResults);
      const initiatives = objective.keyResults.flatMap((kr) =>
        kr.initiatives.map((initiative) => ({
          id: initiative.id,
          name: initiative.name,
          leftPct: pct(initiative.dueDate),
          responsibleLabel: userLabel(initiative.responsibleUser),
          dueDateLabel: formatDate(initiative.dueDate),
          afterObjectiveEnd: initiative.dueDate > end,
        }))
      );

      return {
        id: objective.id,
        code: objective.code,
        title: objective.title,
        leadLabel: userLabel(objective.lead),
        colorIndex: colorIndexByLead.get(objective.lead.id) ?? 0,
        leftPct: pct(start),
        widthPct: pct(end) - pct(start),
        periodLabel: `${periodLabel(objective.periodType, objective.periodValue)} · Due ${formatDate(end)}`,
        scoreLabel: score != null ? `${Math.round(score)}%` : "",
        initiatives,
      };
    });

  const now = new Date();
  const todayLeftPct = now >= gridStart && now < gridEndExclusive ? pct(now) : null;

  return { months, rows, legend, todayLeftPct, unscheduled };
}
