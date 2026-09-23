import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import {
  canViewObjective,
  objectiveScore,
  totalWeighting,
  totalScore,
  topOkrWarnings,
} from "@/lib/okr";
import { OkrWorkspaceGrid } from "@/components/preview/OkrWorkspaceGrid";
import type { OkrCardData } from "@/components/preview/OkrCard";
import { StatCard } from "@/components/preview/StatCard";
import { PeriodSelect } from "@/components/PeriodSelect";
import { ObjectiveForm } from "@/components/okr/ObjectiveForm";
import { DepartmentManager } from "@/components/okr/DepartmentManager";
import { Target, Percent, TrendingUp } from "lucide-react";
import { initialsFor, nameFor } from "@/lib/user";

const DUE_SOON_DAYS = 7;

function periodKey(o: { periodType: string; periodValue: string }) {
  return `${o.periodType}|${o.periodValue}`;
}

function periodLabel(periodType: string, periodValue: string) {
  return `${periodValue} (${periodType === "YEAR" ? "Year" : "Quarter"})`;
}

export default async function OkrsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          departments: { orderBy: { order: "asc" } },
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              department: { select: { name: true } },
              alignedToObjective: { select: { title: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true } },
                  initiatives: { select: { dueDate: true, outcomePercent: true, responsibleUserId: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!business || !membership) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  if (!(await isBusinessEntitled(business.id, "okrs"))) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { members, departments } = business;
  const visibleObjectives = isOwner
    ? business.objectives
    : business.objectives.filter((o) => canViewObjective(membership, o));

  // ---------- Period grouping (most-recently-created period first) ----------
  const periodOrder: string[] = [];
  const periodMeta = new Map<string, { periodType: string; periodValue: string }>();
  for (const o of [...visibleObjectives].reverse()) {
    const key = periodKey(o);
    if (!periodMeta.has(key)) {
      periodMeta.set(key, { periodType: o.periodType, periodValue: o.periodValue });
      periodOrder.push(key);
    }
  }
  const periods = periodOrder.map((key) => {
    const meta = periodMeta.get(key)!;
    return { key, label: periodLabel(meta.periodType, meta.periodValue) };
  });
  const selectedPeriodKey =
    periodParam && periodMeta.has(periodParam) ? periodParam : periods[0]?.key;

  const periodObjectives = selectedPeriodKey
    ? visibleObjectives.filter((o) => periodKey(o) === selectedPeriodKey)
    : [];

  const weightingSum = totalWeighting(periodObjectives);
  const scoreSum = totalScore(periodObjectives);
  const weightingOffBy1Pct = Math.abs(weightingSum - 1) > 0.01;
  const topWarnings = topOkrWarnings(periodObjectives);

  const alignmentOptionsAll = business.objectives.map((o) => ({ id: o.id, title: o.title }));

  // ---------- Cards for the selected period ----------
  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  const okrs: OkrCardData[] = periodObjectives.map((o) => {
    const initiatives = o.keyResults.flatMap((kr) => kr.initiatives);
    const overdueCount = initiatives.filter(
      (i) => i.dueDate < now && (i.outcomePercent == null || i.outcomePercent < 100)
    ).length;
    const dueSoonCount = initiatives.filter(
      (i) =>
        i.dueDate >= now &&
        i.dueDate <= dueSoonCutoff &&
        (i.outcomePercent == null || i.outcomePercent < 100)
    ).length;

    return {
      id: o.id,
      code: o.code,
      title: o.title,
      score: objectiveScore(o.keyResults),
      alignedTo: o.alignedToObjective?.title ?? null,
      department: o.department?.name ?? "No department",
      owner: { initials: initialsFor(o.lead), name: nameFor(o.lead) },
      initiativeCount: initiatives.length,
      overdueCount,
      dueSoonCount,
      keyResults: o.keyResults.map((kr) => ({
        id: kr.id,
        metric: kr.metric,
        target: kr.target,
        outcomePercent: kr.outcomePercent,
      })),
    };
  });

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            OKRs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Objectives, Key Results and Initiatives — plan them, then track
            how they actually landed.
          </p>
        </div>
        <PeriodSelect periods={periods} selected={selectedPeriodKey} />
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      {business.objectives.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives yet. Add your first one below.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Objectives this period" value={String(periodObjectives.length)} icon={Target} />
            <StatCard
              label="Total weighting"
              value={`${Math.round(weightingSum * 100)}%`}
              caption={weightingOffBy1Pct ? "⚠ should total 100%" : "on target"}
              icon={Percent}
              iconClassName={
                weightingOffBy1Pct
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
              }
            />
            <StatCard
              label="Total score"
              value={`${Math.round(scoreSum * 100) / 100}%`}
              icon={TrendingUp}
            />
          </div>

          {topWarnings.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-400/50 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-300">
              {topWarnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {okrs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No objectives assigned to you for this period yet.
            </p>
          ) : (
            <OkrWorkspaceGrid okrs={okrs} basePath="/okrs" />
          )}
        </>
      )}

      {isOwner && (
        <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
          <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Add objective
          </p>
          <ObjectiveForm
            mode="create"
            members={members}
            departments={departments}
            alignmentOptions={alignmentOptionsAll}
          />
        </div>
      )}

      {isOwner && <DepartmentManager departments={departments} />}
    </div>
  );
}
