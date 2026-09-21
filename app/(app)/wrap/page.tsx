import { Users, Smile, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { createWeeklyCheckIn, deleteWeeklyCheckIn } from "@/app/actions/wrap";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { ragHex } from "@/components/preview/colors";

const WELLBEING_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Coping",
  3: "Steady",
  4: "Good",
  5: "Thriving",
};

const WELLBEING_PILL_CLASS: Record<number, string> = {
  1: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  2: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  3: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  4: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  5: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

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

export default async function WrapPage() {
  const businessId = await getSessionBusinessId();
  const business = businessId
    ? await prisma.business.findUnique({ where: { id: businessId } })
    : null;

  if (!business) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "wrap")) {
    return <InactiveNotice />;
  }

  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { businessId: business.id },
    orderBy: [{ weekOf: "desc" }, { createdAt: "desc" }],
  });

  const avgWellbeing = average(checkIns.map((c) => c.wellbeingScore));
  const avgGoalCompletion = average(checkIns.map((c) => c.goalCompletionPct));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Weekly Check-ins (WRAP)
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A quick per-person pulse each week — wellbeing, goal progress, and
          what&apos;s in the way. Feeds next month&apos;s review.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Check-ins" value={String(checkIns.length)} icon={Users} iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" />
        <StatCard
          label="Avg wellbeing"
          value={avgWellbeing != null ? WELLBEING_LABELS[Math.round(avgWellbeing)] : "—"}
          caption={avgWellbeing != null ? `${avgWellbeing.toFixed(1)}/5` : undefined}
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

      <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Add check-in
        </p>
        <form
          action={createWeeklyCheckIn}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Field label="Person" name="personName" required />
          <Field
            label="Week of"
            name="weekOf"
            type="date"
            defaultValue={mostRecentMonday()}
            required
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Wellbeing
            </span>
            <select
              name="wellbeingScore"
              defaultValue={3}
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v} – {WELLBEING_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Goal completion %"
            name="goalCompletionPct"
            type="number"
            step="any"
            defaultValue={0}
            required
          />
          <Field label="Highlights" name="highlights" full />
          <Field label="Blockers" name="blockers" full />
          <Field label="Priorities for next week" name="priorities" full />
          <button
            type="submit"
            className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:col-span-2"
          >
            Add check-in
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3 pb-12">
        {checkIns.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {c.personName}
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Week of {formatDate(c.weekOf)}
                </span>
              </div>
              <form action={deleteWeeklyCheckIn.bind(null, c.id)}>
                <button
                  type="submit"
                  className="text-xs text-zinc-400 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${WELLBEING_PILL_CLASS[c.wellbeingScore]}`}>
                  Wellbeing: {WELLBEING_LABELS[c.wellbeingScore]}
                </span>
                <RagBar value={(c.wellbeingScore / 5) * 100} />
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
        ))}

        {checkIns.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No check-ins yet. Add this week&apos;s above.
          </p>
        )}
      </div>
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
