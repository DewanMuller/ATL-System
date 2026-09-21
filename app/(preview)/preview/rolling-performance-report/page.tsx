import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { formatMonthShort, monthlyPulse } from "@/lib/mrap";
import { formatQuarterLabel } from "@/lib/quarter";
import { VerticalBarChart } from "@/components/preview/charts/VerticalBarChart";
import { CATEGORICAL_SCOPE_CLASS, catVar } from "@/components/preview/colors";

const MONTHS_BACK = 12;

function lastNMonths(n: number) {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default async function PreviewRollingPerformanceReportPage() {
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
  if (!isModuleEntitled(entitlement, "mrap")) {
    return <InactiveNotice />;
  }

  const months = lastNMonths(MONTHS_BACK);

  const [monthlyReviews, quarterlyReviews, pulseByMonth] = await Promise.all([
    prisma.monthlyReview.findMany({
      where: { businessId: business.id, month: { in: months } },
    }),
    prisma.quarterlyReview.findMany({
      where: { businessId: business.id },
      orderBy: { quarter: "asc" },
    }),
    Promise.all(months.map((m) => monthlyPulse(business.id, m))),
  ]);

  const reviewByMonth = new Map(monthlyReviews.map((r) => [r.month, r]));

  const hasAnyOkrData = monthlyReviews.some((r) => r.okrAveragePct != null);
  const hasAnyPulseData = pulseByMonth.some((p) => p.checkInCount > 0);
  const hasAnyQuarterlyData = quarterlyReviews.length > 0;

  const okrItems = months.map((m) => ({
    label: formatMonthShort(m),
    value: Math.round(reviewByMonth.get(m)?.okrAveragePct ?? 0),
    color: catVar(1),
  }));

  const wellbeingItems = months.map((m, i) => ({
    label: formatMonthShort(m),
    value: pulseByMonth[i].avgWellbeing != null ? Math.round((pulseByMonth[i].avgWellbeing! / 5) * 100) : 0,
    color: catVar(2),
  }));

  const goalCompletionItems = months.map((m, i) => ({
    label: formatMonthShort(m),
    value: Math.round(pulseByMonth[i].avgGoalCompletion ?? 0),
    color: catVar(3),
  }));

  const quarterlyItems = quarterlyReviews.map((q) => ({
    label: formatQuarterLabel(q.quarter),
    value: Math.round(q.okrAveragePct ?? 0),
    color: catVar(4),
  }));

  return (
    <div className={`flex flex-col gap-6 pb-12 ${CATEGORICAL_SCOPE_CLASS}`}>
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Rolling Performance Report
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Trends across your last {MONTHS_BACK} months of MRAPs and every
          QRAP on record, built from your saved monthly and quarterly
          reviews and weekly check-ins.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly OKR average
        </h2>
        {hasAnyOkrData ? (
          <VerticalBarChart items={okrItems} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No monthly reviews with a saved OKR average yet — submit one on{" "}
            <a href="/preview/submit-mrap" className="underline">
              Submit MRAP
            </a>
            .
          </p>
        )}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly team wellbeing (as % of max)
        </h2>
        {hasAnyPulseData ? (
          <VerticalBarChart items={wellbeingItems} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No weekly check-ins logged in this window yet.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly goal completion
        </h2>
        {hasAnyPulseData ? (
          <VerticalBarChart items={goalCompletionItems} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No weekly check-ins logged in this window yet.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Quarterly OKR average (QRAP)
        </h2>
        {hasAnyQuarterlyData ? (
          <VerticalBarChart items={quarterlyItems} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No quarterly reviews saved yet — submit one on the{" "}
            <a href="/qrap" className="underline">
              QRAP
            </a>{" "}
            page.
          </p>
        )}
      </section>
    </div>
  );
}
