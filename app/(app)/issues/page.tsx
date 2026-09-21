import { AlertTriangle, CheckCircle2, Clock, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { currentQuarterString, formatQuarterLabel, shiftQuarter } from "@/lib/quarter";
import {
  createIssue,
  saveDibrAnalysis,
  setCeoApproval,
  convertIssueToNextStep,
  escalateIssueToQrap,
  deleteIssue,
} from "@/app/actions/issues";

const LEVEL_LABELS: Record<string, string> = {
  COMPANY: "Company",
  DIVISIONAL: "Divisional",
  ROLE: "Role",
};

export default async function IssuesPage() {
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

  const [issues, objectives] = await Promise.all([
    prisma.issue.findMany({
      where: { businessId: business.id },
      include: { convertedNextStep: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.objective.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Issues" value={String(total)} icon={AlertTriangle} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
        <StatCard
          label="Not yet DIBRed"
          value={String(openIssues.length)}
          icon={Clock}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        />
        <StatCard
          label="DIBRed"
          value={String(dibredCount)}
          icon={CheckCircle2}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          label="DIBR compliance"
          value={compliancePct != null ? `${Math.round(compliancePct)}%` : "—"}
          icon={Percent}
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        />
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
        <RagBar value={compliancePct ?? 0} />
        <div className="mt-3 flex flex-wrap gap-2">
          {(["COMPANY", "DIVISIONAL", "ROLE"] as const).map((level) => {
            const levelIssues = issues.filter((i) => i.level === level);
            if (levelIssues.length === 0) return null;
            const levelDibred = levelIssues.filter((i) => i.dibred).length;
            return (
              <span
                key={level}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {LEVEL_LABELS[level]}: {levelDibred}/{levelIssues.length}
              </span>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Log an issue
        </p>
        <form
          action={createIssue}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <Field label="Issue" name="title" required full />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Level
            </span>
            <select
              name="level"
              defaultValue="ROLE"
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <option value="COMPANY">Company</option>
              <option value="DIVISIONAL">Divisional</option>
              <option value="ROLE">Role</option>
            </select>
          </label>
          <Field label="Accountable owner" name="accountableOwner" required />
          <button
            type="submit"
            className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Log issue
          </button>
        </form>
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
              <form
                action={saveDibrAnalysis}
                className="mt-3 flex flex-col gap-3"
              >
                <input type="hidden" name="issueId" value={issue.id} />
                <TextArea
                  label="Root cause"
                  name="rootCause"
                  defaultValue={issue.rootCause ?? undefined}
                />
                <TextArea
                  label="Action plan"
                  name="actionPlan"
                  defaultValue={issue.actionPlan ?? undefined}
                />
                <button
                  type="submit"
                  className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save analysis &amp; mark DIBRed
                </button>
              </form>
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
              <form action={setCeoApproval} className="mt-3">
                <input type="hidden" name="issueId" value={issue.id} />
                <input
                  type="hidden"
                  name="approved"
                  value={(!issue.ceoApproved).toString()}
                />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    issue.ceoApproved
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {issue.ceoApproved
                    ? "✓ DIBR approved by CEO"
                    : "Mark DIBR approved by CEO"}
                </button>
              </form>
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
                <div className="flex flex-wrap items-end gap-3">
                  {objectives.length > 0 && (
                    <form
                      action={convertIssueToNextStep}
                      className="flex items-end gap-2"
                    >
                      <input type="hidden" name="issueId" value={issue.id} />
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          Convert to Next Step under
                        </span>
                        <select
                          name="objectiveId"
                          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-zinc-900"
                        >
                          {objectives.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          Due date
                        </span>
                        <input
                          type="date"
                          name="dueDate"
                          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-zinc-900"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-md border border-black/10 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
                      >
                        Convert
                      </button>
                    </form>
                  )}
                  <form action={escalateIssueToQrap}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-black/10 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
                    >
                      No fitting OKR — escalate to {formatQuarterLabel(nextQuarter)} QRAP
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}

        {dibredIssues.length === 0 && openIssues.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No issues logged yet.
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
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {issue.title}
        </h4>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {LEVEL_LABELS[issue.level]} · Owner: {issue.accountableOwner}
        </span>
      </div>
      <form action={deleteIssue.bind(null, issue.id)}>
        <button
          type="submit"
          className="text-xs text-zinc-400 hover:text-red-600"
        >
          Delete
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  full,
}: {
  label: string;
  name: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${full ? "sm:col-span-3" : ""}`}
    >
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        required={required}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={2}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
