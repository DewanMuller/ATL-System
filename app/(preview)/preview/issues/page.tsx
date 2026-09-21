import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { ProgressBar } from "@/components/ProgressBar";
import { currentQuarterString, formatQuarterLabel, shiftQuarter } from "@/lib/quarter";

const LEVEL_LABELS: Record<string, string> = {
  COMPANY: "Company",
  DIVISIONAL: "Divisional",
  ROLE: "Role",
};

export default async function PreviewIssuesPage() {
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
  if (!isModuleEntitled(entitlement, "issues")) {
    return <InactiveNotice />;
  }

  const issues = await prisma.issue.findMany({
    where: { businessId: business.id },
    include: { convertedNextStep: true },
    orderBy: { createdAt: "desc" },
  });

  const total = issues.length;
  const dibredCount = issues.filter((i) => i.dibred).length;
  const compliancePct = total > 0 ? (dibredCount / total) * 100 : null;
  const nextQuarter = shiftQuarter(currentQuarterString(), 1);

  const openIssues = issues.filter((i) => !i.dibred);
  const dibredIssues = issues.filter((i) => i.dibred);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Issues &amp; DIBR
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Log a bottleneck, drive it to a root cause and an owned action
          plan, then turn it into either a Next Step under an OKR or an
          adjustment for {formatQuarterLabel(nextQuarter)}&apos;s QRAP.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            DIBR compliance
          </span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {compliancePct != null ? `${Math.round(compliancePct)}%` : "—"}
          </span>
        </div>
        <ProgressBar value={compliancePct ?? 0} />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {dibredCount} of {total} logged issue{total === 1 ? "" : "s"} DIBRed.{" "}
          {(["COMPANY", "DIVISIONAL", "ROLE"] as const).map((level) => {
            const levelIssues = issues.filter((i) => i.level === level);
            if (levelIssues.length === 0) return null;
            const levelDibred = levelIssues.filter((i) => i.dibred).length;
            return (
              <span key={level} className="mr-3">
                {LEVEL_LABELS[level]}: {levelDibred}/{levelIssues.length}
              </span>
            );
          })}
        </p>
      </div>

      {openIssues.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Not yet DIBRed ({openIssues.length})
          </h3>
          {openIssues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-xl border border-amber-300/60 bg-white p-5 dark:border-amber-500/30 dark:bg-zinc-950"
            >
              <IssueHeader issue={issue} />
              {(issue.rootCause || issue.actionPlan) && (
                <dl className="mt-3 flex flex-col gap-1 text-sm">
                  {issue.rootCause && (
                    <div>
                      <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                        Root cause:{" "}
                      </dt>
                      <dd className="inline text-zinc-600 dark:text-zinc-400">
                        {issue.rootCause}
                      </dd>
                    </div>
                  )}
                  {issue.actionPlan && (
                    <div>
                      <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                        Action plan:{" "}
                      </dt>
                      <dd className="inline text-zinc-600 dark:text-zinc-400">
                        {issue.actionPlan}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pb-12">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          DIBRed ({dibredIssues.length})
        </h3>
        {dibredIssues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
          >
            <IssueHeader issue={issue} />

            <dl className="mt-3 flex flex-col gap-1 text-sm">
              {issue.rootCause && (
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                    Root cause:{" "}
                  </dt>
                  <dd className="inline text-zinc-600 dark:text-zinc-400">
                    {issue.rootCause}
                  </dd>
                </div>
              )}
              {issue.actionPlan && (
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                    Action plan:{" "}
                  </dt>
                  <dd className="inline text-zinc-600 dark:text-zinc-400">
                    {issue.actionPlan}
                  </dd>
                </div>
              )}
            </dl>

            {issue.level === "COMPANY" && (
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  issue.ceoApproved
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {issue.ceoApproved ? "✓ DIBR approved by CEO" : "Awaiting CEO approval"}
              </span>
            )}

            <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
              {issue.convertedNextStepId ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Converted to Next Step: {issue.convertedNextStep?.title}
                </p>
              ) : issue.escalatedToQuarter ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Escalated to {formatQuarterLabel(issue.escalatedToQuarter)}
                  &apos;s QRAP adjustments
                </p>
              ) : (
                <p className="text-xs text-zinc-400">
                  Not yet converted to a Next Step or escalated.
                </p>
              )}
            </div>
          </div>
        ))}

        {dibredIssues.length === 0 && openIssues.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No issues logged yet — log one on the{" "}
            <a href="/issues" className="underline">
              Issues
            </a>{" "}
            page.
          </p>
        )}
      </div>
    </div>
  );
}

function IssueHeader({
  issue,
}: {
  issue: { id: string; title: string; level: string; accountableOwner: string };
}) {
  return (
    <div>
      <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
        {issue.title}
      </h4>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {LEVEL_LABELS[issue.level]} · Owner: {issue.accountableOwner}
      </span>
    </div>
  );
}
