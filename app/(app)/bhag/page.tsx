import { Target, CalendarRange, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { targetCellLabel, metricProgress } from "@/lib/bhag";
import {
  updateBhagVision,
  createBhagPeriod,
  updateBhagPeriod,
  deleteBhagPeriod,
  createBhagMetric,
  updateBhagMetric,
  deleteBhagMetric,
  updateBhagTarget,
  updateBhagActual,
} from "@/app/actions/bhag";
import { TextField, SubmitButton } from "@/components/FormFields";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { ragForPercent, ragHex } from "@/components/preview/colors";

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

type MetricWithData = {
  id: string;
  category: string | null;
  name: string;
  unit: string | null;
  currentValue: number | null;
  targets: { periodId: string; value: number | null; note: string | null }[];
  snapshots: { id: string; value: number | null; recordedAt: Date }[];
};

export default async function BhagPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          bhag: true,
          bhagPeriods: { orderBy: { order: "asc" } },
          bhagMetrics: {
            orderBy: { order: "asc" },
            include: {
              targets: { select: { periodId: true, value: true, note: true } },
              snapshots: { orderBy: { recordedAt: "desc" } },
            },
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

  if (!(await isBusinessEntitled(business.id, "bhag"))) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const { bhag, bhagPeriods, bhagMetrics } = business;

  // Progress is measured against the longest-horizon time period (the last
  // one in display order) — that's the metric's "ultimate" BHAG target.
  const finalPeriod = bhagPeriods[bhagPeriods.length - 1];
  function finalProgress(metric: MetricWithData) {
    const target = finalPeriod ? metric.targets.find((t) => t.periodId === finalPeriod.id) : undefined;
    return metricProgress(metric.currentValue, target?.value ?? null);
  }
  const onTargetCount = bhagMetrics.filter((m) => {
    const p = finalProgress(m);
    return p != null && p >= 70;
  }).length;

  // Group consecutive metrics that share a category, so the category label
  // renders once (rowSpan) like the merged cells in the reference table.
  const rows: { metric: MetricWithData; groupStart: boolean; groupSize: number }[] = [];
  bhagMetrics.forEach((metric, i) => {
    const prev = bhagMetrics[i - 1];
    const sameGroupAsPrev = metric.category != null && prev?.category === metric.category;
    if (sameGroupAsPrev) {
      rows.push({ metric, groupStart: false, groupSize: 0 });
    } else {
      let size = 1;
      for (let j = i + 1; j < bhagMetrics.length; j++) {
        if (metric.category != null && bhagMetrics[j].category === metric.category) size++;
        else break;
      }
      rows.push({ metric, groupStart: true, groupSize: size });
    }
  });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          BHAG
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your Big Hairy Audacious Goal — the metrics and time horizons
          everything else ladders up to.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Metrics tracked" value={String(bhagMetrics.length)} icon={Target} />
        <StatCard
          label="Time horizons"
          value={String(bhagPeriods.length)}
          icon={CalendarRange}
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        />
        <StatCard
          label="On target"
          value={String(onTargetCount)}
          caption={bhagMetrics.length > 0 ? `of ${bhagMetrics.length}` : undefined}
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
      </div>

      {/* Vision statement */}
      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        {bhag ? (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {bhag.title}
            </h2>
            {bhag.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {bhag.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No BHAG set yet.
            {isOwner ? " Add one below." : " Ask your owner to set one."}
          </p>
        )}

        {isOwner && (
          <details className="mt-4" open={!bhag}>
            <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {bhag ? "Edit vision statement" : "Set your BHAG"}
            </summary>
            <form
              action={updateBhagVision}
              className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <TextField label="Title" name="title" defaultValue={bhag?.title} required full />
              <TextField
                label="Description"
                name="description"
                defaultValue={bhag?.description ?? undefined}
                full
              />
              <SubmitButton full>Save</SubmitButton>
            </form>
          </details>
        )}
      </section>

      {/* Scorecard */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Scorecard
        </h2>

        {bhagMetrics.length === 0 || bhagPeriods.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isOwner
              ? "Add at least one metric and one time horizon below to build your scorecard."
              : "No BHAG scorecard set up yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="border border-black/5 px-3 py-2 text-left dark:border-white/5">
                    Category
                  </th>
                  <th className="border border-black/5 px-3 py-2 text-left dark:border-white/5">
                    Metric
                  </th>
                  <th className="border border-black/5 px-3 py-2 text-left dark:border-white/5">
                    Actual
                  </th>
                  {bhagPeriods.map((p) => (
                    <th
                      key={p.id}
                      className="border border-black/5 px-3 py-2 text-left dark:border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{p.label}</span>
                        {isOwner && (
                          <form action={deleteBhagPeriod.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="text-[10px] text-zinc-400 hover:text-red-600"
                              title="Delete this time horizon"
                            >
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                      {isOwner && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] font-normal normal-case text-zinc-400 hover:text-zinc-600">
                            Rename
                          </summary>
                          <form action={updateBhagPeriod} className="mt-1 flex gap-1">
                            <input type="hidden" name="periodId" value={p.id} />
                            <input
                              name="label"
                              defaultValue={p.label}
                              className="w-24 rounded border border-black/10 bg-white px-1 py-0.5 text-xs normal-case text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                            />
                            <button
                              type="submit"
                              className="rounded border border-black/10 px-1.5 text-xs normal-case dark:border-white/10"
                            >
                              Save
                            </button>
                          </form>
                        </details>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ metric, groupStart, groupSize }) => (
                  <tr key={metric.id} className="align-top">
                    {groupStart && (
                      <td
                        rowSpan={groupSize}
                        className="border border-black/5 bg-zinc-50/50 px-3 py-2 align-top text-xs font-semibold uppercase text-zinc-500 dark:border-white/5 dark:bg-zinc-900/40 dark:text-zinc-400"
                      >
                        {metric.category ?? ""}
                      </td>
                    )}
                    <td className="border border-black/5 px-3 py-2 text-zinc-800 dark:border-white/5 dark:text-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>{metric.name}</span>
                        {isOwner && (
                          <form action={deleteBhagMetric.bind(null, metric.id)}>
                            <button
                              type="submit"
                              className="text-[10px] text-zinc-400 hover:text-red-600"
                              title="Delete this metric"
                            >
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                      {isOwner && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600">
                            Edit
                          </summary>
                          <form action={updateBhagMetric} className="mt-1 flex flex-col gap-1">
                            <input type="hidden" name="metricId" value={metric.id} />
                            <input
                              name="category"
                              placeholder="Category (optional)"
                              defaultValue={metric.category ?? ""}
                              className="w-full rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                            />
                            <input
                              name="name"
                              defaultValue={metric.name}
                              required
                              className="w-full rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                            />
                            <input
                              name="unit"
                              placeholder="Unit (optional)"
                              defaultValue={metric.unit ?? ""}
                              className="w-full rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                            />
                            <button
                              type="submit"
                              className="self-start rounded border border-black/10 px-1.5 text-xs dark:border-white/10"
                            >
                              Save
                            </button>
                          </form>
                        </details>
                      )}
                    </td>
                    <td className="border border-black/5 px-3 py-2 dark:border-white/5">
                      {(() => {
                        const progress = finalProgress(metric);
                        const status = progress != null ? ragForPercent(progress) : null;
                        return (
                          <>
                            <div
                              className="text-sm font-medium"
                              style={{ color: status ? ragHex(status) : undefined }}
                            >
                              {metric.currentValue != null
                                ? `${metric.currentValue}${metric.unit ? ` ${metric.unit}` : ""}`
                                : "—"}
                            </div>
                            {progress != null && (
                              <div className="mt-1 w-24">
                                <RagBar value={progress} />
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {isOwner && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600">
                            Update
                          </summary>
                          <form action={updateBhagActual} className="mt-1 flex gap-1">
                            <input type="hidden" name="metricId" value={metric.id} />
                            <input
                              name="value"
                              type="number"
                              step="any"
                              defaultValue={metric.currentValue ?? undefined}
                              className="w-20 rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                            />
                            <button
                              type="submit"
                              className="rounded border border-black/10 px-1.5 text-xs dark:border-white/10"
                            >
                              Save
                            </button>
                          </form>
                        </details>
                      )}
                      {metric.snapshots.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600">
                            History ({metric.snapshots.length})
                          </summary>
                          <table className="mt-1 w-full text-left text-[11px]">
                            <tbody>
                              {metric.snapshots.map((s) => (
                                <tr key={s.id} className="border-t border-black/5 dark:border-white/5">
                                  <td className="py-0.5 pr-2 text-zinc-500 dark:text-zinc-400">
                                    {formatDateTime(s.recordedAt)}
                                  </td>
                                  <td className="py-0.5 text-zinc-700 dark:text-zinc-300">
                                    {s.value ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}
                    </td>
                    {bhagPeriods.map((p) => {
                      const target = metric.targets.find((t) => t.periodId === p.id);
                      const label = targetCellLabel(target, metric.unit);
                      return (
                        <td key={p.id} className="border border-black/5 px-3 py-2 dark:border-white/5">
                          <div className="text-zinc-800 dark:text-zinc-200">{label ?? "—"}</div>
                          {isOwner && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600">
                                Edit
                              </summary>
                              <form action={updateBhagTarget} className="mt-1 flex flex-col gap-1">
                                <input type="hidden" name="metricId" value={metric.id} />
                                <input type="hidden" name="periodId" value={p.id} />
                                <input
                                  name="value"
                                  type="number"
                                  step="any"
                                  placeholder="Value"
                                  defaultValue={target?.value ?? undefined}
                                  className="w-full rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                                />
                                <input
                                  name="note"
                                  placeholder="Note (optional)"
                                  defaultValue={target?.note ?? ""}
                                  className="w-full rounded border border-black/10 bg-white px-1 py-0.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                                />
                                <button
                                  type="submit"
                                  className="self-start rounded border border-black/10 px-1.5 text-xs dark:border-white/10"
                                >
                                  Save
                                </button>
                              </form>
                            </details>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isOwner && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-black/15 p-4 dark:border-white/15">
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Add time horizon
              </p>
              <form action={createBhagPeriod} className="flex gap-2">
                <TextField
                  label=""
                  name="label"
                  placeholder="e.g. 18 months, 5 Year - 2031"
                  required
                  full
                />
                <SubmitButton>Add</SubmitButton>
              </form>
            </div>
            <div className="rounded-xl border border-dashed border-black/15 p-4 dark:border-white/15">
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Add metric
              </p>
              <form action={createBhagMetric} className="grid grid-cols-3 gap-2">
                <TextField label="" name="category" placeholder="Category" />
                <TextField label="" name="name" placeholder="Metric name" required />
                <TextField label="" name="unit" placeholder="Unit" />
                <SubmitButton full>Add metric</SubmitButton>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
