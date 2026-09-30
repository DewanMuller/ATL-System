import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canEditOutcome } from "@/lib/okr";
import { toDateInputValue } from "@/lib/forms";
import {
  requestDueDateChange,
  approveDueDateChange,
  rejectDueDateChange,
} from "@/app/actions/dueDateApprovals";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function userLabel(u: { name: string | null; email: string } | null) {
  if (!u) return "—";
  return u.name || u.email;
}

const STATUS_CLASSES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default async function DueDateApprovalsPage() {
  const membership = await getSessionMembership();
  if (!membership) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  const entitlement = await getAtlEntitlement(membership.businessId);
  if (!isModuleEntitled(entitlement, "okrs")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";

  const requestInclude = {
    initiative: {
      select: {
        id: true,
        name: true,
        keyResult: { select: { metric: true, objective: { select: { id: true, title: true } } } },
      },
    },
    requestedBy: { select: { id: true, name: true, email: true } },
    decidedBy: { select: { id: true, name: true, email: true } },
  } as const;

  const [pendingRequests, decidedRequests, myRequests, business] = await Promise.all([
    isOwner
      ? prisma.dueDateChangeRequest.findMany({
          where: { businessId: membership.businessId, status: "PENDING" },
          include: requestInclude,
          orderBy: { createdAt: "asc" },
        })
      : [],
    isOwner
      ? prisma.dueDateChangeRequest.findMany({
          where: { businessId: membership.businessId, NOT: { status: "PENDING" } },
          include: requestInclude,
          orderBy: { decidedAt: "desc" },
          take: 15,
        })
      : [],
    !isOwner
      ? prisma.dueDateChangeRequest.findMany({
          where: { businessId: membership.businessId, requestedById: membership.userId },
          include: requestInclude,
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    !isOwner
      ? prisma.business.findUnique({
          where: { id: membership.businessId },
          select: {
            objectives: {
              select: {
                id: true,
                title: true,
                leadUserId: true,
                keyResults: {
                  select: {
                    metric: true,
                    initiatives: {
                      select: { id: true, name: true, dueDate: true, responsibleUserId: true },
                      orderBy: { dueDate: "asc" },
                    },
                  },
                },
              },
            },
          },
        })
      : null,
  ]);

  // Eligible-to-request initiatives for a member: the same population that
  // can already edit that initiative's Part B outcome (its Objective's Lead,
  // or its own Responsible person) — see lib/okr.ts's canEditOutcome.
  const myEligibleInitiatives: {
    id: string;
    name: string;
    objectiveTitle: string;
    keyResultMetric: string;
    dueDate: Date;
  }[] = [];
  if (!isOwner && business) {
    // Excludes any initiative with an open request business-wide, not just
    // the current member's own — two people can both be eligible to request
    // on the same initiative (its Lead and its Responsible person).
    const allPending = await prisma.dueDateChangeRequest.findMany({
      where: { businessId: membership.businessId, status: "PENDING" },
      select: { initiativeId: true },
    });
    const pendingInitiativeIds = new Set(allPending.map((p) => p.initiativeId));

    for (const o of business.objectives) {
      for (const kr of o.keyResults) {
        for (const i of kr.initiatives) {
          if (pendingInitiativeIds.has(i.id)) continue;
          if (!canEditOutcome(membership, { leadUserId: o.leadUserId }, i.responsibleUserId)) continue;
          myEligibleInitiatives.push({
            id: i.id,
            name: i.name,
            objectiveTitle: o.title,
            keyResultMetric: kr.metric,
            dueDate: i.dueDate,
          });
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Due Date Approvals
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isOwner
            ? "Requested due-date changes waiting on your sign-off."
            : "Initiative due dates are owner-controlled — request a change here instead of editing it directly."}
        </p>
      </div>

      {isOwner ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Pending ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting on you.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{r.initiative.name}</p>
                      <p className="text-xs text-zinc-400">
                        {r.initiative.keyResult.objective.title} → {r.initiative.keyResult.metric}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Requested by {userLabel(r.requestedBy)} ·{" "}
                        <span className="text-zinc-700 dark:text-zinc-300">{formatDate(r.currentDueDate)}</span>
                        {" → "}
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatDate(r.requestedDueDate)}</span>
                      </p>
                      {r.reason && (
                        <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">&quot;{r.reason}&quot;</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={approveDueDateChange}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-950/30"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectDueDateChange}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Recent decisions
            </h2>
            {decidedRequests.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No decisions yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2">Initiative</th>
                      <th className="px-4 py-2">Requested by</th>
                      <th className="px-4 py-2">Change</th>
                      <th className="px-4 py-2">Decided by</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decidedRequests.map((r) => (
                      <tr key={r.id} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{r.initiative.name}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{userLabel(r.requestedBy)}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                          {formatDate(r.currentDueDate)} → {formatDate(r.requestedDueDate)}
                        </td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{userLabel(r.decidedBy)}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[r.status]}`}>
                            {r.status === "APPROVED" ? "Approved" : "Rejected"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Request a change
            </h2>
            {myEligibleInitiatives.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nothing you lead or are responsible for is eligible right now — either there&apos;s
                nothing on your plate, or a request is already pending on it.
              </p>
            ) : (
              <form action={requestDueDateChange} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950 sm:flex-row sm:items-end sm:flex-wrap">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Initiative</span>
                  <select
                    name="initiativeId"
                    required
                    className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    {myEligibleInitiatives.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.objectiveTitle} → {i.name} (due {formatDate(i.dueDate)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">New due date</span>
                  <input
                    type="date"
                    name="requestedDueDate"
                    required
                    min={toDateInputValue(new Date())}
                    className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Reason (optional)</span>
                  <input
                    type="text"
                    name="reason"
                    placeholder="Why does this need to move?"
                    className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Submit request
                </button>
              </form>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Your requests
            </h2>
            {myRequests.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">You haven&apos;t requested any due-date changes.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2">Initiative</th>
                      <th className="px-4 py-2">Change</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((r) => (
                      <tr key={r.id} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                          {r.initiative.keyResult.objective.title} → {r.initiative.name}
                        </td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                          {formatDate(r.currentDueDate)} → {formatDate(r.requestedDueDate)}
                        </td>
                        <td className="px-4 py-2">
                          {r.status === "PENDING" ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Pending
                            </span>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[r.status]}`}>
                              {r.status === "APPROVED" ? "Approved" : "Rejected"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
