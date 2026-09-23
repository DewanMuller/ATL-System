import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective } from "@/lib/okr";
import { Avatar } from "@/components/preview/Avatar";
import { statusLabel, ragFor } from "@/components/preview/initiativeStatus";
import { ragHex } from "@/components/preview/colors";
import { initialsFor, nameFor } from "@/lib/user";

const DUE_SOON_DAYS = 7;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

type Card = {
  id: string;
  name: string;
  dueDate: Date;
  owner: { initials: string; name: string };
  objectiveTitle: string;
  objectiveId: string;
};

function InitiativeCard({ card, accent }: { card: Card; accent: string }) {
  return (
    <Link
      href={`/preview/okr-workspace/${card.objectiveId}?tab=planner`}
      className="block rounded-lg border border-black/10 border-l-4 bg-white p-3 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
      style={{ borderLeftColor: accent }}
    >
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{card.name}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{card.objectiveTitle}</p>
      <div className="mt-2 flex items-center justify-between">
        <Avatar initials={card.owner.initials} name={card.owner.name} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(card.dueDate)}</span>
      </div>
    </Link>
  );
}

export default async function PreviewFocusPlanningPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true, name: true, email: true } },
                  initiatives: {
                    include: { responsibleUser: { select: { id: true, name: true, email: true } } },
                    orderBy: { dueDate: "asc" },
                  },
                },
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

  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  const overdue: Card[] = [];
  const dueSoon: Card[] = [];
  const atRisk: Card[] = [];
  const needsPlan: { objectiveId: string; objectiveTitle: string; metric: string; target: string; responsible: { initials: string; name: string } }[] = [];

  for (const o of visibleObjectives) {
    for (const kr of o.keyResults) {
      if (kr.initiatives.length === 0) {
        needsPlan.push({
          objectiveId: o.id,
          objectiveTitle: o.title,
          metric: kr.metric,
          target: kr.target,
          responsible: { initials: initialsFor(kr.responsibleUser), name: nameFor(kr.responsibleUser) },
        });
      }
      for (const i of kr.initiatives) {
        const card: Card = {
          id: i.id,
          name: i.name,
          dueDate: i.dueDate,
          owner: { initials: initialsFor(i.responsibleUser), name: nameFor(i.responsibleUser) },
          objectiveTitle: o.title,
          objectiveId: o.id,
        };
        const label = statusLabel(i, now);
        if (label === "Overdue") {
          overdue.push(card);
        } else if (i.dueDate <= dueSoonCutoff && label !== "Completed") {
          dueSoon.push(card);
        } else if (ragFor(i, now) === "AMBER") {
          atRisk.push(card);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Focus Planning
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          What actually needs attention this cycle — computed live from due
          dates and progress, not a submitted plan.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Overdue ({overdue.length})
          </h2>
          {overdue.length === 0 ? (
            <p className="text-xs text-zinc-400">Nothing overdue.</p>
          ) : (
            overdue.map((c) => <InitiativeCard key={c.id} card={c} accent="#e5484d" />)
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Due within {DUE_SOON_DAYS} days ({dueSoon.length})
          </h2>
          {dueSoon.length === 0 ? (
            <p className="text-xs text-zinc-400">Nothing due soon.</p>
          ) : (
            dueSoon.map((c) => <InitiativeCard key={c.id} card={c} accent="#f5a524" />)
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            At risk ({atRisk.length})
          </h2>
          {atRisk.length === 0 ? (
            <p className="text-xs text-zinc-400">Nothing currently at risk.</p>
          ) : (
            atRisk.map((c) => <InitiativeCard key={c.id} card={c} accent={ragHex("AMBER")} />)
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Key Results with no initiatives yet ({needsPlan.length})
        </h2>
        {needsPlan.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Every key result already has at least one initiative.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Objective</th>
                  <th className="px-4 py-2">Key Result</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Responsible</th>
                </tr>
              </thead>
              <tbody>
                {needsPlan.map((n, i) => (
                  <tr key={i} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                      <Link href={`/preview/okr-workspace/${n.objectiveId}?tab=planner`} className="hover:underline">
                        {n.objectiveTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{n.metric}</td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{n.target}</td>
                    <td className="px-4 py-2">
                      <Avatar initials={n.responsible.initials} name={n.responsible.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
