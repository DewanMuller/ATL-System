import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { targetCellLabel } from "@/lib/bhag";

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

export default async function PreviewBhagPage() {
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

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "bhag")) {
    return <InactiveNotice />;
  }

  const { bhag, bhagPeriods, bhagMetrics } = business;

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
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          BHAG
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your Big Hairy Audacious Goal — the metrics and time horizons
          everything else ladders up to.
        </p>
      </div>

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
            No BHAG set yet — set one on the{" "}
            <a href="/bhag" className="underline">
              BHAG
            </a>{" "}
            page.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Scorecard
        </h2>

        {bhagMetrics.length === 0 || bhagPeriods.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No BHAG scorecard set up yet.
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
                      {p.label}
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
                      {metric.name}
                    </td>
                    <td className="border border-black/5 px-3 py-2 dark:border-white/5">
                      <div className="text-zinc-800 dark:text-zinc-200">
                        {metric.currentValue != null
                          ? `${metric.currentValue}${metric.unit ? ` ${metric.unit}` : ""}`
                          : "—"}
                      </div>
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
                        </td>
                      );
                    })}
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
