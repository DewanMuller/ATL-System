import { prisma } from "@/lib/prisma";

// Objective Score = the average of outcomePercent across its Key Results.
// Null (not zero) until at least one Key Result has an outcome recorded —
// an un-scored objective must not silently drag the total down to 0.
export function objectiveScore(keyResults: { outcomePercent: number | null }[]) {
  const scored = keyResults
    .map((kr) => kr.outcomePercent)
    .filter((pct): pct is number => pct != null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, pct) => sum + pct, 0) / scored.length;
}

// Sum of weighting (0–1 fractions) across a set of objectives — shown
// prominently in the UI as a soft warning when it isn't ~100%, never a hard
// block (real planning periods drift before they're finalized).
export function totalWeighting(objectives: { weighting: number }[]) {
  return objectives.reduce((sum, o) => sum + o.weighting, 0);
}

// "Top 3" is a soft pick, not a hard-capped rank — same philosophy as
// weighting above. Company-wide count is checked across the whole set
// passed in; department counts are checked per department (an objective
// with no department contributes to its own "no department" bucket so it
// isn't silently dropped from the check).
export function topOkrWarnings(
  objectives: {
    id: string;
    departmentId: string | null;
    isTopCompanyOkr: boolean;
    isTopDepartmentOkr: boolean;
  }[]
) {
  const warnings: string[] = [];

  const topCompanyCount = objectives.filter((o) => o.isTopCompanyOkr).length;
  if (topCompanyCount > 3) {
    warnings.push(`${topCompanyCount} objectives are marked as Top 3 Company OKRs — pick 3.`);
  }

  const byDepartment = new Map<string, number>();
  for (const o of objectives) {
    if (!o.isTopDepartmentOkr) continue;
    const key = o.departmentId ?? "__none__";
    byDepartment.set(key, (byDepartment.get(key) ?? 0) + 1);
  }
  for (const count of byDepartment.values()) {
    if (count > 3) {
      warnings.push(`A department has ${count} objectives marked Top 3 — pick 3.`);
    }
  }

  return warnings;
}

// Sum of (Objective Score × weighting) across a set of objectives. An
// objective with no score yet contributes 0 to this sum (per spec), which
// is why this is distinct from simply averaging the scores.
export function totalScore(
  objectives: { weighting: number; keyResults: { outcomePercent: number | null }[] }[]
) {
  return objectives.reduce((sum, o) => {
    const score = objectiveScore(o.keyResults);
    return sum + (score ?? 0) * o.weighting;
  }, 0);
}

// Used by MRAP/QRAP review snapshots as a single "how are the OKRs doing"
// number — the plain average of every currently-scored Objective across the
// business, independent of period (MRAP/QRAP are business-wide rituals, not
// scoped to one OKR period).
export async function currentOkrAverage(businessId: string) {
  const objectives = await prisma.objective.findMany({
    where: { businessId },
    select: { weighting: true, keyResults: { select: { outcomePercent: true } } },
  });

  const scores = objectives
    .map((o) => objectiveScore(o.keyResults))
    .filter((score): score is number => score != null);
  if (scores.length === 0) return null;

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

type ObjectiveForVisibility = {
  leadUserId: string;
  contributors: { userId: string }[];
  keyResults: {
    responsibleUserId: string;
    initiatives: { responsibleUserId: string }[];
  }[];
};

// A regular member sees an Objective only if they're its Lead, a
// Contributor, or the Responsible person on one of its Key Results or
// Initiatives. Owners see everything for their business.
export function canViewObjective(
  membership: { role: string; userId: string },
  objective: ObjectiveForVisibility
) {
  if (membership.role === "OWNER") return true;
  if (objective.leadUserId === membership.userId) return true;
  if (objective.contributors.some((c) => c.userId === membership.userId)) return true;
  return objective.keyResults.some(
    (kr) =>
      kr.responsibleUserId === membership.userId ||
      kr.initiatives.some((i) => i.responsibleUserId === membership.userId)
  );
}

// Editing a Key Result's or Initiative's Part B outcome is restricted to
// the Objective's Lead, the Responsible person on that specific record, or
// an owner/admin.
export function canEditOutcome(
  membership: { role: string; userId: string },
  objective: { leadUserId: string },
  responsibleUserId: string
) {
  if (membership.role === "OWNER") return true;
  if (objective.leadUserId === membership.userId) return true;
  return responsibleUserId === membership.userId;
}
