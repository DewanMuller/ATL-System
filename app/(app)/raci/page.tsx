import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective } from "@/lib/okr";
import {
  RACI_LETTER,
  RACI_ROLES,
  countByRole,
  effectiveAssignments,
} from "@/lib/raci";
import { RaciTable } from "@/components/RaciTable";

type UserRef = { id: string; name: string | null; email: string };

function userLabel(u: UserRef) {
  return u.name || u.email;
}

export default async function RaciPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              contributors: { select: { userId: true } },
              keyResults: {
                select: {
                  responsibleUserId: true,
                  initiatives: { select: { responsibleUserId: true } },
                },
              },
              raciAssignments: { select: { userId: true, role: true } },
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

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "okrs")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { members } = business;
  const visibleObjectives = isOwner
    ? business.objectives
    : business.objectives.filter((o) => canViewObjective(membership, o));

  const objectives = visibleObjectives.map((o) => ({
    ...o,
    effective: effectiveAssignments(o, o.raciAssignments),
  }));

  const capacity = isOwner
    ? members
        .map((m) => {
          const assignments = business.objectives.flatMap((o) =>
            effectiveAssignments(o, o.raciAssignments).filter((a) => a.userId === m.user.id)
          );
          const counts = countByRole(assignments);
          return { user: m.user, counts, total: assignments.length };
        })
        .sort((a, b) => b.total - a.total)
    : [];

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          RACI Matrix
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Who is Responsible, Accountable, Consulted or Informed on each
          objective — and how workload is spread across the team.
        </p>
      </div>

      <details className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
          What is RACI?
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1 font-semibold text-green-700 dark:text-green-400">
              R — Responsible
            </p>
            <p>The &quot;doer&quot; — completes the work or leads the people who do.</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-amber-700 dark:text-amber-400">
              A — Accountable
            </p>
            <p>
              &quot;The buck stops here&quot; — held accountable for the
              outcome. Only one A per objective.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-rose-700 dark:text-rose-400">
              C — Consulted
            </p>
            <p>&quot;In the loop&quot; — asked for input before a decision or action, two-way.</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-blue-700 dark:text-blue-400">
              I — Informed
            </p>
            <p>&quot;Kept in the picture&quot; — told after the fact, one-way.</p>
          </div>
        </div>
        <div className="mt-4 border-t border-black/5 pt-3 text-xs text-zinc-600 dark:border-white/5 dark:text-zinc-400">
          <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
            Filled in automatically:
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>An objective&apos;s Lead is automatically its Accountable person.</li>
            <li>Anyone Responsible for one of its Initiatives is automatically Responsible on the objective.</li>
            <li>Picking a different letter for that person overrides the automatic one.</li>
          </ul>
          <p className="mb-1 mt-3 font-medium text-zinc-700 dark:text-zinc-300">
            Reading the matrix for capacity management:
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>Lots of R&apos;s for one person — are they overloaded?</li>
            <li>No R&apos;s or A&apos;s for someone — is their role still needed here?</li>
            <li>Too many A&apos;s for one person — a bottleneck, or a segregation-of-duties issue?</li>
          </ul>
        </div>
      </details>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      {objectives.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives yet — add some on the OKRs page first.
        </p>
      ) : (
        <RaciTable objectives={objectives} members={members.map((m) => m.user)} isOwner={isOwner} />
      )}

      {isOwner && capacity.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Workload by person
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-1 pr-3 font-medium">Person</th>
                  {RACI_ROLES.map((role) => (
                    <th key={role} className="px-2 py-1 text-center font-medium">
                      {RACI_LETTER[role]}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {capacity.map(({ user, counts, total }) => (
                  <tr key={user.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-1.5 pr-3 text-zinc-800 dark:text-zinc-200">
                      {userLabel(user)}
                    </td>
                    {RACI_ROLES.map((role) => (
                      <td key={role} className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
                        {counts[role] || ""}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-medium text-zinc-900 dark:text-zinc-50">
                      {total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
