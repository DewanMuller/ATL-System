import { objectiveScore } from "@/lib/okr";
import { ragForPercent } from "@/components/preview/colors";

// There is no per-department ("pillar") MRAP submission in the real data
// model — only a single company-wide MonthlyReview. This computes a live
// OKR-average rollup per Department directly from Objective/KeyResult data,
// for the Pillar MRAP pages. It is a computed snapshot, not a submitted
// record, and callers should label it as such.
export type DepartmentObjective = {
  weighting: number;
  keyResults: { outcomePercent: number | null }[];
};

export type DepartmentForRollup = {
  id: string;
  code: string;
  name: string;
  objectives: DepartmentObjective[];
};

export type DepartmentRollup = {
  id: string;
  code: string;
  name: string;
  objectiveCount: number;
  averageScore: number | null;
  green: number;
  amber: number;
  red: number;
  notStarted: number;
};

export function buildDepartmentRollups(departments: DepartmentForRollup[]): DepartmentRollup[] {
  return departments.map((d) => {
    const scores = d.objectives.map((o) => objectiveScore(o.keyResults));
    const scored = scores.filter((s): s is number => s != null);
    const averageScore = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

    let green = 0;
    let amber = 0;
    let red = 0;
    let notStarted = 0;
    for (const score of scores) {
      if (score == null) notStarted++;
      else {
        const band = ragForPercent(score);
        if (band === "GREEN") green++;
        else if (band === "AMBER") amber++;
        else red++;
      }
    }

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      objectiveCount: d.objectives.length,
      averageScore,
      green,
      amber,
      red,
      notStarted,
    };
  });
}
