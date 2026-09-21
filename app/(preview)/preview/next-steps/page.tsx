import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { updateNextStepStatus, updateNextStepAssignee } from "@/app/actions/business";
import { StatusSelect } from "@/components/StatusSelect";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { formatQuarterLabel } from "@/lib/quarter";

function assigneeName(assignee: { name: string | null; email: string } | null) {
  return assignee ? assignee.name || assignee.email : "Unassigned";
}

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, m - 1, 1));
}

function contextLabel(step: {
  objective: { title: string } | null;
  keyResult: { metric: string } | null;
  weeklyCheckIn: { weekOf: Date; personName: string } | null;
  monthlyReview: { month: string } | null;
  quarterlyReview: { quarter: string } | null;
  otherContext: string | null;
}) {
  if (step.weeklyCheckIn) {
    return `WRAP · ${formatDate(step.weeklyCheckIn.weekOf)} (${step.weeklyCheckIn.personName})`;
  }
  if (step.monthlyReview) {
    return `MRAP · ${formatMonthLabel(step.monthlyReview.month)}`;
  }
  if (step.quarterlyReview) {
    return `QRAP · ${formatQuarterLabel(step.quarterlyReview.quarter)}`;
  }
  if (step.otherContext) {
    return `Other · ${step.otherContext}`;
  }
  if (step.keyResult) {
    return `${step.objective?.title ?? ""} → ${step.keyResult.metric}`;
  }
  return step.objective?.title ?? "—";
}

export default async function PreviewNextStepsPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          nextSteps: {
            include: {
              objective: { select: { title: true } },
              keyResult: { select: { metric: true } },
              weeklyCheckIn: { select: { weekOf: true, personName: true } },
              monthlyReview: { select: { month: true } },
              quarterlyReview: { select: { quarter: true } },
              assignee: { select: { id: true, name: true, email: true } },
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
  if (!isModuleEntitled(entitlement, "nextSteps")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { members } = business;
  const nextSteps = isOwner
    ? business.nextSteps
    : business.nextSteps.filter((n) => n.assigneeId === membership.userId);

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Next Steps
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The concrete initiatives that come out of your OKRs and your
          WRAP/MRAP/QRAP meetings.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing next steps assigned to you.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="w-28 px-4 py-2">Status</th>
              <th className="px-4 py-2">Step</th>
              <th className="w-48 px-4 py-2">Context</th>
              <th className="w-36 px-4 py-2">Assignee</th>
              <th className="w-24 px-4 py-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {nextSteps.map((step) => (
              <tr
                key={step.id}
                className="border-t border-black/10 dark:border-white/10"
              >
                <td className="px-4 py-2">
                  {isOwner ? (
                    <StatusSelect
                      action={updateNextStepStatus}
                      idField="nextStepId"
                      id={step.id}
                      status={step.status}
                    />
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        step.status === "GREEN"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : step.status === "AMBER"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {step.status === "GREEN" ? "Green" : step.status === "AMBER" ? "Amber" : "Red"}
                    </span>
                  )}
                </td>
                <td className="break-words px-4 py-2 text-zinc-800 dark:text-zinc-200">
                  {step.title}
                  {step.notes && (
                    <details className="mt-1">
                      <summary className="inline-block cursor-pointer rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                        See note
                      </summary>
                      <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400">
                        {step.notes}
                      </p>
                    </details>
                  )}
                </td>
                <td className="break-words px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {contextLabel(step)}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {isOwner ? (
                    <AssigneeSelect
                      action={updateNextStepAssignee}
                      idField="nextStepId"
                      id={step.id}
                      assigneeId={step.assigneeId}
                      members={members}
                      fallbackLabel={step.owner}
                    />
                  ) : (
                    assigneeName(step.assignee)
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {formatDate(step.dueDate) ?? "—"}
                </td>
              </tr>
            ))}
            {nextSteps.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No next steps yet — add some on the{" "}
                  <a href="/next-steps" className="underline">
                    Next Steps
                  </a>{" "}
                  page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
