import Link from "next/link";
import { Users, Smile, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { createWeeklyCheckIn, deleteWeeklyCheckIn } from "@/app/actions/wrap";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { ragHex } from "@/components/preview/colors";
import { WELLBEING_MIN, WELLBEING_MAX, wellbeingLabel, wellbeingPillClass, wellbeingAsPercent } from "@/lib/wellbeing";
import { nameFor } from "@/lib/user";

const TABS = [
  { key: "submit", label: "This week" },
  { key: "history", label: "History" },
] as const;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function mostRecentMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7;
  now.setDate(now.getDate() - diff);
  return now.toISOString().slice(0, 10);
}

type CheckIn = {
  id: string;
  userId: string;
  user: { name: string | null; email: string };
  weekOf: Date;
  wellbeingScore: number;
  goalCompletionPct: number;
  highlights: string | null;
  blockers: string | null;
  priorities: string | null;
};

function CheckInCard({ c, canDelete }: { c: CheckIn; canDelete: boolean }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {nameFor(c.user)}
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Week of {formatDate(c.weekOf)}
          </span>
        </div>
        {canDelete && (
          <form action={deleteWeeklyCheckIn.bind(null, c.id)}>
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-red-600"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${wellbeingPillClass(c.wellbeingScore)}`}>
            Wellbeing: {wellbeingLabel(c.wellbeingScore)} ({c.wellbeingScore}/10)
          </span>
          <RagBar value={wellbeingAsPercent(c.wellbeingScore)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: ragHex(c.goalCompletionPct >= 70 ? "GREEN" : c.goalCompletionPct >= 40 ? "AMBER" : "RED") }}
          >
            Goal completion: {Math.round(c.goalCompletionPct)}%
          </span>
          <RagBar value={c.goalCompletionPct} />
        </div>
      </div>

      {(c.highlights || c.blockers || c.priorities) && (
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          {c.highlights && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                Highlights:{" "}
              </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">
                {c.highlights}
              </dd>
            </div>
          )}
          {c.blockers && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                Blockers:{" "}
              </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">
                {c.blockers}
              </dd>
            </div>
          )}
          {c.priorities && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                Priorities:{" "}
              </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">
                {c.priorities}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

export default async function WrapPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "submit";

  const membership = await getSessionMembership();
  if (!membership) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  if (!(await isBusinessEntitled(membership.businessId, "wrap"))) {
    return <InactiveNotice />;
  }

  const [checkIns, members] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { businessId: membership.businessId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ weekOf: "desc" }, { createdAt: "desc" }],
    }),
    prisma.membership.findMany({
      where: { businessId: membership.businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const avgWellbeing = average(checkIns.map((c) => c.wellbeingScore));
  const avgGoalCompletion = average(checkIns.map((c) => c.goalCompletionPct));

  const currentWeek = mostRecentMonday();
  const thisWeekCheckIns = checkIns.filter(
    (c) => c.weekOf.toISOString().slice(0, 10) === currentWeek
  );
  const thisWeekUserIds = new Set(thisWeekCheckIns.map((c) => c.userId));
  const outstandingMembers = members.filter((m) => !thisWeekUserIds.has(m.userId));

  const myCheckInThisWeek = thisWeekCheckIns.find((c) => c.userId === membership.userId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Weekly Check-ins (WRAP)
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A quick per-person pulse each week — wellbeing, goal progress, and
          what&apos;s in the way. Feeds next month&apos;s MRAP.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Check-ins" value={String(checkIns.length)} icon={Users} iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" />
        <StatCard
          label="Avg wellbeing"
          value={avgWellbeing != null ? wellbeingLabel(Math.round(avgWellbeing)) : "—"}
          caption={avgWellbeing != null ? `${avgWellbeing.toFixed(1)}/10` : undefined}
          icon={Smile}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          label="Avg goal completion"
          value={avgGoalCompletion != null ? `${Math.round(avgGoalCompletion)}%` : "—"}
          icon={Target}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-black/10 p-1 dark:border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/wrap?tab=${t.key}`}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "submit" && (
        <>
          <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
            <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {myCheckInThisWeek ? "Update your check-in" : "Add your check-in"}
            </p>
            <form
              key={`${myCheckInThisWeek?.id ?? "new"}-${myCheckInThisWeek?.wellbeingScore}-${myCheckInThisWeek?.goalCompletionPct}`}
              action={createWeeklyCheckIn}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <Field
                label="Week of"
                name="weekOf"
                type="date"
                defaultValue={currentWeek}
                required
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Wellbeing (0 = In Crisis, 10 = Excelling)
                </span>
                <select
                  name="wellbeingScore"
                  defaultValue={myCheckInThisWeek?.wellbeingScore ?? 5}
                  className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                >
                  {Array.from({ length: WELLBEING_MAX - WELLBEING_MIN + 1 }, (_, i) => WELLBEING_MAX - i).map((v) => (
                    <option key={v} value={v}>
                      {v} – {wellbeingLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Goal completion %"
                name="goalCompletionPct"
                type="number"
                step="any"
                defaultValue={myCheckInThisWeek?.goalCompletionPct ?? 0}
                required
              />
              <Field label="Highlights" name="highlights" defaultValue={myCheckInThisWeek?.highlights ?? undefined} full />
              <Field label="Blockers" name="blockers" defaultValue={myCheckInThisWeek?.blockers ?? undefined} full />
              <Field label="Priorities for next week" name="priorities" defaultValue={myCheckInThisWeek?.priorities ?? undefined} full />
              <button
                type="submit"
                className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:col-span-2"
              >
                {myCheckInThisWeek ? "Update check-in" : "Add check-in"}
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              This week ({thisWeekCheckIns.length} of {members.length} submitted)
            </h2>
            {outstandingMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {outstandingMembers.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {nameFor(m.user)} — outstanding
                  </span>
                ))}
              </div>
            )}
            {thisWeekCheckIns.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No check-ins for this week yet — add yours above.
              </p>
            ) : (
              thisWeekCheckIns.map((c) => (
                <CheckInCard key={c.id} c={c} canDelete={c.userId === membership.userId || membership.role === "OWNER"} />
              ))
            )}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-3 pb-12">
          {checkIns.map((c) => (
            <CheckInCard key={c.id} c={c} canDelete={c.userId === membership.userId || membership.role === "OWNER"} />
          ))}

          {checkIns.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No check-ins yet. Add this week&apos;s on the &quot;This
              week&quot; tab.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  full,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  full?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
