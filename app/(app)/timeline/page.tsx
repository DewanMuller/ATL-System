import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective } from "@/lib/okr";
import { buildTimelineData } from "@/lib/timeline";
import { Timeline } from "@/components/charts/Timeline";

export default async function TimelinePage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true, name: true, email: true } },
                  initiatives: {
                    include: {
                      responsibleUser: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { dueDate: "asc" },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
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

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "okrs")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const visibleObjectives = isOwner
    ? business.objectives
    : business.objectives.filter((o) => canViewObjective(membership, o));

  const timeline = buildTimelineData(visibleObjectives);

  if (!timeline) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Timeline
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            A calendar view of every OKR and initiative due date, so you can
            spot clashing timelines across departments.
          </p>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives with a recognizable period yet. Set a Period on the{" "}
          <Link href="/okrs" className="underline">
            OKRs
          </Link>{" "}
          page to see them here.
        </p>
      </div>
    );
  }

  const { months, rows, legend, todayLeftPct, unscheduled } = timeline;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Timeline
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every objective&apos;s period and every initiative&apos;s due date
          on one calendar, so clashing or misaligned timelines across
          departments jump out.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      <Timeline months={months} rows={rows} legend={legend} todayLeftPct={todayLeftPct} />

      {unscheduled.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-400/50 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-medium">
            {unscheduled.length} objective
            {unscheduled.length === 1 ? "" : "s"} couldn&apos;t be placed on
            the timeline — their Period field isn&apos;t a recognizable
            year/quarter:
          </p>
          <ul className="mt-1 list-disc pl-4">
            {unscheduled.map((o) => (
              <li key={o.id}>
                {o.title} (&quot;{o.periodValue}&quot;)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
