import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { WELLBEING_LABELS, formatMonthLabel, monthlyPulse } from "@/lib/mrap";

export default async function PreviewCompanyMrapPage() {
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

  const allReviews = await prisma.monthlyReview.findMany({
    where: { businessId: business.id },
    orderBy: { month: "desc" },
  });

  const historyWithPulse = await Promise.all(
    allReviews.map(async (review) => ({
      review,
      pulse: await monthlyPulse(business.id, review.month),
    }))
  );

  const [latest, ...rest] = historyWithPulse;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Company MRAP
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The full company-wide Review, Assess &amp; Plan log — one review
          per month.
        </p>
      </div>

      {!latest ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No monthly reviews saved yet — submit one on the{" "}
          <a href="/mrap" className="underline">
            MRAP
          </a>{" "}
          page.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-emerald-500/30 bg-white p-5 dark:border-emerald-400/30 dark:bg-zinc-950">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Latest
            </p>
            <ReviewCard entry={latest} />
          </section>

          {rest.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                History
              </h2>
              {rest.map((entry) => (
                <div
                  key={entry.review.id}
                  className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
                >
                  <ReviewCard entry={entry} />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReviewCard({
  entry,
}: {
  entry: {
    review: {
      month: string;
      okrAveragePct: number | null;
      highlights: string | null;
      blockers: string | null;
      priorities: string | null;
    };
    pulse: { avgWellbeing: number | null; avgGoalCompletion: number | null };
  };
}) {
  const { review, pulse } = entry;
  return (
    <div>
      <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{formatMonthLabel(review.month)}</h4>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        OKR {review.okrAveragePct != null ? `${Math.round(review.okrAveragePct)}%` : "—"} · Wellbeing{" "}
        {pulse.avgWellbeing != null ? WELLBEING_LABELS[Math.round(pulse.avgWellbeing)] : "—"} · Goals{" "}
        {pulse.avgGoalCompletion != null ? `${Math.round(pulse.avgGoalCompletion)}%` : "—"}
      </span>

      {(review.highlights || review.blockers || review.priorities) && (
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          {review.highlights && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Highlights: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{review.highlights}</dd>
            </div>
          )}
          {review.blockers && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Blockers: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{review.blockers}</dd>
            </div>
          )}
          {review.priorities && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Priorities: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{review.priorities}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
