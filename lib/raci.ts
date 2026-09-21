// RACI: who is Responsible, Accountable, Consulted or Informed on an
// Objective — see the "What is RACI?" panel on the RACI Matrix page for the
// full explanation these definitions are drawn from.
export const RACI_ROLES = ["RESPONSIBLE", "ACCOUNTABLE", "CONSULTED", "INFORMED"] as const;
export type RaciRoleValue = (typeof RACI_ROLES)[number];

export const RACI_LETTER: Record<RaciRoleValue, "R" | "A" | "C" | "I"> = {
  RESPONSIBLE: "R",
  ACCOUNTABLE: "A",
  CONSULTED: "C",
  INFORMED: "I",
};

export const RACI_LABEL: Record<RaciRoleValue, string> = {
  RESPONSIBLE: "Responsible",
  ACCOUNTABLE: "Accountable",
  CONSULTED: "Consulted",
  INFORMED: "Informed",
};

export const LETTER_TO_RACI_ROLE: Record<string, RaciRoleValue> = {
  R: "RESPONSIBLE",
  A: "ACCOUNTABLE",
  C: "CONSULTED",
  I: "INFORMED",
};

// One Accountable person per activity is the RACI rule (see the deck's
// "Tips & Traps" — "ONLY one accountability per activity"). Enforced here as
// a warning rather than a hard block, matching how ATL treats every other
// soft-planning rule (e.g. OKR weighting totals) elsewhere in the app.
export function accountableWarning(assignments: { role: RaciRoleValue }[]) {
  const accountableCount = assignments.filter((a) => a.role === "ACCOUNTABLE").length;
  if (accountableCount === 0) return "No one is marked Accountable yet.";
  if (accountableCount > 1) return `${accountableCount} people are marked Accountable — RACI calls for only one.`;
  return null;
}

// Colors follow the RACI reference deck: Responsible=green, Accountable=
// amber, Consulted=rose (kept distinct from the RAG-status red used
// elsewhere in ATL), Informed=blue.
export const RACI_STYLES: Record<"R" | "A" | "C" | "I" | "", string> = {
  R: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  A: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  C: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  I: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "": "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600",
};

export type EffectiveRaciAssignment = {
  userId: string;
  role: RaciRoleValue;
  implied: boolean;
  impliedReason?: string;
};

type ObjectiveForRaci = {
  leadUserId: string;
  keyResults: { initiatives: { responsibleUserId: string }[] }[];
};

// Two relationships imply a RACI role without anyone having to type it in:
// an Objective's Lead is automatically its Accountable person, and anyone
// Responsible for one of its Initiatives is automatically Responsible on
// the objective itself. An explicit RaciAssignment always overrides the
// implied one for that same person — this only fills in what nobody has
// bothered to set yet, it never contradicts a deliberate choice.
export function effectiveAssignments(
  objective: ObjectiveForRaci,
  explicit: { userId: string; role: RaciRoleValue }[]
): EffectiveRaciAssignment[] {
  const explicitByUser = new Map(explicit.map((a) => [a.userId, a.role]));
  const result = new Map<string, EffectiveRaciAssignment>();

  if (!explicitByUser.has(objective.leadUserId)) {
    result.set(objective.leadUserId, {
      userId: objective.leadUserId,
      role: "ACCOUNTABLE",
      implied: true,
      impliedReason: "Lead of this objective",
    });
  }

  for (const kr of objective.keyResults) {
    for (const initiative of kr.initiatives) {
      const userId = initiative.responsibleUserId;
      if (explicitByUser.has(userId) || result.has(userId)) continue;
      result.set(userId, {
        userId,
        role: "RESPONSIBLE",
        implied: true,
        impliedReason: "Responsible for an initiative under this objective",
      });
    }
  }

  for (const [userId, role] of explicitByUser) {
    result.set(userId, { userId, role, implied: false });
  }

  return [...result.values()];
}

export function countByRole(assignments: { role: RaciRoleValue }[]) {
  const counts: Record<RaciRoleValue, number> = {
    RESPONSIBLE: 0,
    ACCOUNTABLE: 0,
    CONSULTED: 0,
    INFORMED: 0,
  };
  for (const a of assignments) counts[a.role]++;
  return counts;
}
