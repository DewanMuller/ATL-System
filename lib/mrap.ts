import { prisma } from "@/lib/prisma";

// Shared by /mrap, /preview/submit-mrap, /preview/mrap-review,
// /preview/company-mrap and /preview/rolling-performance-report so the
// month math and wellbeing labels never drift between them.
export const WELLBEING_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Coping",
  3: "Steady",
  4: "Good",
  5: "Thriving",
};

export function currentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  return { start: new Date(year, m - 1, 1), end: new Date(year, m, 1) };
}

export function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, m - 1, 1));
}

export function formatMonthShort(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, m - 1, 1));
}

export function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function monthlyPulse(businessId: string, month: string) {
  const { start, end } = monthRange(month);
  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { businessId, weekOf: { gte: start, lt: end } },
  });
  return {
    avgWellbeing: average(checkIns.map((c) => c.wellbeingScore)),
    avgGoalCompletion: average(checkIns.map((c) => c.goalCompletionPct)),
    checkInCount: checkIns.length,
  };
}
