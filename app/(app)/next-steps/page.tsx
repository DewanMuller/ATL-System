import { ListTodo, TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import {
  createNextStep,
  updateNextStepStatus,
  updateNextStepAssignee,
  deleteNextStep,
} from "@/app/actions/business";
import { StatusSelect } from "@/components/StatusSelect";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { TextField, SubmitButton, AssigneeField } from "@/components/FormFields";
import { NextStepContextFields } from "@/components/NextStepContextFields";
import { formatQuarterLabel } from "@/lib/quarter";
import { canViewObjective } from "@/lib/okr";
import { StatCard } from "@/components/preview/StatCard";
import { Avatar } from "@/components/preview/Avatar";
import { initialsFor } from "@/lib/user";

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

export default async function NextStepsPage() {
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
          objectives: {
            select: {
              id: true,
              title: true,
              leadUserId: true,
              contributors: { select: { userId: true } },
              keyResults: {
                select: {
                  responsibleUserId: true,
                  initiatives: { select: { responsibleUserId: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          weeklyCheckIns: {
            select: { id: true, weekOf: true, personName: true },
            orderBy: { weekOf: "desc" },
          },
          monthlyReviews: {
            select: { id: true, month: true },
            orderBy: { month: "desc" },
          },
          quarterlyReviews: {
            select: { id: true, quarter: true },
            orderBy: { quarter: "desc" },
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

  if (!(await isBusinessEntitled(business.id, "nextSteps"))) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { members } = business;
  const nextSteps = isOwner
    ? business.nextSteps
    : business.nextSteps.filter((n) => n.assigneeId === membership.userId);
  const statusCounts = {
    GREEN: nextSteps.filter((n) => n.status === "GREEN").length,
    AMBER: nextSteps.filter((n) => n.status === "AMBER").length,
    RED: nextSteps.filter((n) => n.status === "RED").length,
  };
  const objectives = (
    isOwner
      ? business.objectives
      : business.objectives.filter((o) => canViewObjective(membership, o))
  ).map((o) => ({ id: o.id, title: o.title }));
  const weeklyCheckInOptions = business.weeklyCheckIns.map((c) => ({
    id: c.id,
    label: `${formatDate(c.weekOf)} — ${c.personName}`,
  }));
  const monthlyReviewOptions = business.monthlyReviews.map((m) => ({
    id: m.id,
    label: formatMonthLabel(m.month),
  }));
  const quarterlyReviewOptions = business.quarterlyReviews.map((q) => ({
    id: q.id,
    label: formatQuarterLabel(q.quarter),
  }));

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={String(nextSteps.length)} icon={ListTodo} iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" />
        <StatCard
          label="On Track"
          value={String(statusCounts.GREEN)}
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          label="At Risk"
          value={String(statusCounts.AMBER)}
          icon={AlertTriangle}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          label="Off Track"
          value={String(statusCounts.RED)}
          icon={XCircle}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="w-28 px-4 py-2">Status</th>
              <th className="px-4 py-2">Step</th>
              <th className="w-48 px-4 py-2">Context</th>
              <th className="w-36 px-4 py-2">Assignee</th>
              <th className="w-24 px-4 py-2">Due</th>
              <th className="w-16 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {nextSteps.map((step) => (
              <tr
                key={step.id}
                className="border-t border-black/10 dark:border-white/10"
              >
                <td className="px-4 py-2">
                  <StatusSelect
                    action={updateNextStepStatus}
                    idField="nextStepId"
                    id={step.id}
                    status={step.status}
                  />
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
                  ) : step.assignee ? (
                    <Avatar initials={initialsFor(step.assignee)} name={assigneeName(step.assignee)} />
                  ) : (
                    step.owner || "Unassigned"
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {formatDate(step.dueDate) ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteNextStep.bind(null, step.id)}>
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {nextSteps.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No next steps yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Add next step
        </p>
        <form
          action={createNextStep}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <TextField label="Step" name="title" required full />
          <NextStepContextFields
            objectives={objectives}
            weeklyCheckIns={weeklyCheckInOptions}
            monthlyReviews={monthlyReviewOptions}
            quarterlyReviews={quarterlyReviewOptions}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </span>
            <select
              name="status"
              defaultValue="AMBER"
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </select>
          </label>
          {isOwner && (
            <AssigneeField members={members} defaultValue={membership.userId} />
          )}
          <TextField label="Due date" name="dueDate" type="date" />
          <TextField label="Notes" name="notes" full />
          <SubmitButton>Add next step</SubmitButton>
        </form>
      </div>
    </div>
  );
}
