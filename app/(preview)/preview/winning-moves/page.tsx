import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { updateWinningMoveStatus, updateWinningMoveAssignee } from "@/app/actions/winningMoves";
import { StatusSelect } from "@/components/StatusSelect";
import { AssigneeSelect } from "@/components/AssigneeSelect";

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

export default async function PreviewWinningMovesPage() {
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

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="w-28 px-4 py-2">Status</th>
              <th className="px-4 py-2">Move</th>
              <th className="w-40 px-4 py-2">Linked OKR</th>
              <th className="w-36 px-4 py-2">Assignee</th>
              <th className="w-24 px-4 py-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {winningMoves.map((move) => (
              <tr
                key={move.id}
                className="border-t border-black/10 dark:border-white/10"
              >
                <td className="px-4 py-2">
                  {isOwner ? (
                    <StatusSelect
                      action={updateWinningMoveStatus}
                      idField="winningMoveId"
                      id={move.id}
                      status={move.status}
                    />
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        move.status === "GREEN"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : move.status === "AMBER"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {move.status === "GREEN" ? "Green" : move.status === "AMBER" ? "Amber" : "Red"}
                    </span>
                  )}
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
                  ) : (
                    assigneeName(move.assignee)
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                  {formatDate(move.dueDate) ?? "—"}
                </td>
              </tr>
            ))}
            {winningMoves.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No winning moves yet — add some on the{" "}
                  <a href="/winning-moves" className="underline">
                    Winning Moves
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
