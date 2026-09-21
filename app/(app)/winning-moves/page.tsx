import { Trophy, TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import {
  createWinningMove,
  updateWinningMoveStatus,
  updateWinningMoveAssignee,
  deleteWinningMove,
} from "@/app/actions/winningMoves";
import { StatusSelect } from "@/components/StatusSelect";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { TextField, SubmitButton, AssigneeField } from "@/components/FormFields";
import { canViewObjective } from "@/lib/okr";
import { StatCard } from "@/components/preview/StatCard";
import { Avatar } from "@/components/preview/Avatar";

function assigneeName(assignee: { name: string | null; email: string } | null) {
  return assignee ? assignee.name || assignee.email : "Unassigned";
}

function initialsFor(user: { name: string | null; email: string }) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function WinningMovesPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          winningMoves: {
            include: {
              objective: { select: { title: true } },
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
  if (!isModuleEntitled(entitlement, "winningMoves")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { members } = business;
  const winningMoves = isOwner
    ? business.winningMoves
    : business.winningMoves.filter((w) => w.assigneeId === membership.userId);
  const statusCounts = {
    GREEN: winningMoves.filter((w) => w.status === "GREEN").length,
    AMBER: winningMoves.filter((w) => w.status === "AMBER").length,
    RED: winningMoves.filter((w) => w.status === "RED").length,
  };
  const objectives = (
    isOwner
      ? business.objectives
      : business.objectives.filter((o) => canViewObjective(membership, o))
  ).map((o) => ({ id: o.id, title: o.title }));

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Winning Moves
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The bold moves that push your OKRs forward.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing winning moves assigned to you.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={String(winningMoves.length)} icon={Trophy} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
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
              <th className="px-4 py-2">Move</th>
              <th className="w-40 px-4 py-2">Linked OKR</th>
              <th className="w-36 px-4 py-2">Assignee</th>
              <th className="w-24 px-4 py-2">Due</th>
              <th className="w-16 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {winningMoves.map((move) => (
              <tr
                key={move.id}
                className="border-t border-black/10 dark:border-white/10"
              >
                <td className="px-4 py-2">
                  <StatusSelect
                    action={updateWinningMoveStatus}
                    idField="winningMoveId"
                    id={move.id}
                    status={move.status}
                  />
                </td>
                <td className="break-words px-4 py-2 text-zinc-800 dark:text-zinc-200">
                  {move.title}
                  {move.description && (
                    <details className="mt-1">
                      <summary className="inline-block cursor-pointer rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                        See note
                      </summary>
                      <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400">
                        {move.description}
                      </p>
                    </details>
                  )}
                </td>
                <td className="break-words px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {move.objective?.title ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {isOwner ? (
                    <AssigneeSelect
                      action={updateWinningMoveAssignee}
                      idField="winningMoveId"
                      id={move.id}
                      assigneeId={move.assigneeId}
                      members={members}
                    />
                  ) : move.assignee ? (
                    <Avatar initials={initialsFor(move.assignee)} name={assigneeName(move.assignee)} />
                  ) : (
                    "Unassigned"
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {formatDate(move.dueDate) ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteWinningMove.bind(null, move.id)}>
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
            {winningMoves.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No winning moves yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Add winning move
        </p>
        <form
          action={createWinningMove}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <TextField label="Winning move" name="title" required full />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Linked OKR
            </span>
            <select
              name="objectiveId"
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <option value="">None</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
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
          <TextField label="Description" name="description" full />
          <SubmitButton>Add winning move</SubmitButton>
        </form>
      </div>
    </div>
  );
}
