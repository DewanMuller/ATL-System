"use server";

import { revalidatePath } from "next/cache";
import type { RagStatus, MeasureType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireBusiness } from "@/lib/business";
import { parseOptionalFloat } from "@/lib/forms";
import { WELLBEING_MIN, WELLBEING_MAX } from "@/lib/wellbeing";
import { computeOutcomePercent } from "@/lib/measure";
import { ragForPercent } from "@/components/preview/colors";
import { currentOkrAverage } from "@/lib/okr";

type OwnedKeyResult = {
  id: string;
  measureType: MeasureType;
  targetValue: number | null;
  startValue: number | null;
};

// Same reporting rule as WRAP's initiatives (see app/actions/wrap.ts):
// every measure type reports a real value — a percent for MANUAL, 0/1 for
// BINARY, a real number for NUMERIC — and the RAG is always derived from
// it, never chosen separately.
function readKeyResultFields(formData: FormData, kr: OwnedKeyResult) {
  const notes = String(formData.get(`notes-${kr.id}`) ?? "") || null;

  const reportedValue = parseOptionalFloat(formData.get(`value-${kr.id}`));
  const measuredPercent = computeOutcomePercent({
    measureType: kr.measureType,
    startValue: kr.startValue,
    targetValue: kr.targetValue,
    currentValue: reportedValue,
  });
  const status: RagStatus = measuredPercent == null ? "AMBER" : ragForPercent(measuredPercent);
  return { id: kr.id, status, reportedValue, measuredPercent, notes };
}

// Each person submits their own monthly check-in, tied to their own
// session — the real per-person Level 1 MRAP template, not the old
// single company-wide text entry. Resubmitting the same month updates it
// (see the @@unique([userId, month]) constraint).
export async function createMonthlyCheckIn(formData: FormData) {
  const membership = await requireMembership();

  const month = String(formData.get("month") ?? "");
  const wellbeingScore = Number(formData.get("wellbeingScore"));

  if (!/^\d{4}-\d{2}$/.test(month)) return;
  if (!Number.isFinite(wellbeingScore) || wellbeingScore < WELLBEING_MIN || wellbeingScore > WELLBEING_MAX) return;

  // Re-fetch the submitter's owned key results server-side rather than
  // trusting whatever ids the client posted, same reasoning as WRAP.
  const myKeyResults = await prisma.keyResult.findMany({
    where: { responsibleUserId: membership.userId, objective: { businessId: membership.businessId } },
    select: { id: true, measureType: true, targetValue: true, startValue: true },
  });
  const keyResultUpdates = myKeyResults.map((kr) => readKeyResultFields(formData, kr));

  const data = {
    wellbeingScore,
    highlights: String(formData.get("highlights") ?? "") || null,
    blockers: String(formData.get("blockers") ?? "") || null,
    helpNeeded: String(formData.get("helpNeeded") ?? "") || null,
    dibrFollowUp: String(formData.get("dibrFollowUp") ?? "") || null,
    priorities: String(formData.get("priorities") ?? "") || null,
  };

  await prisma.$transaction(async (tx) => {
    const checkIn = await tx.monthlyCheckIn.upsert({
      where: { userId_month: { userId: membership.userId, month } },
      create: {
        businessId: membership.businessId,
        userId: membership.userId,
        month,
        ...data,
      },
      update: data,
    });

    for (const u of keyResultUpdates) {
      await tx.keyResultCheckIn.upsert({
        where: { monthlyCheckInId_keyResultId: { monthlyCheckInId: checkIn.id, keyResultId: u.id } },
        create: {
          monthlyCheckInId: checkIn.id,
          keyResultId: u.id,
          status: u.status,
          reportedValue: u.reportedValue,
          notes: u.notes,
        },
        update: { status: u.status, reportedValue: u.reportedValue, notes: u.notes },
      });

      if (u.reportedValue != null) {
        await tx.keyResult.update({
          where: { id: u.id },
          data: { currentValue: u.reportedValue, outcomePercent: u.measuredPercent },
        });
      }
    }
  });

  // Done as a separate step, after the check-in transaction commits, for
  // two reasons: it needs the KeyResult.outcomePercent updates above to
  // already be visible to read the fresh average, and an interactive
  // transaction held open across this extra read risked exceeding Prisma's
  // 5s transaction timeout. Keeps the business+month anchor's OKR snapshot
  // fresh so QRAP, the rolling performance report, and Next Steps'
  // "MRAP · <month>" context tag keep working without their own form.
  const okrAveragePct = await currentOkrAverage(membership.businessId);
  await prisma.monthlyReview.upsert({
    where: { businessId_month: { businessId: membership.businessId, month } },
    create: { businessId: membership.businessId, month, okrAveragePct },
    update: { okrAveragePct },
  });

  revalidatePath("/mrap");
  revalidatePath("/dashboard");
  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/my-work");
  revalidatePath("/qrap");
  revalidatePath("/rolling-performance-report");
  revalidatePath("/next-steps");
}

export async function deleteMonthlyCheckIn(checkInId: string) {
  const membership = await requireMembership();

  const checkIn = await prisma.monthlyCheckIn.findFirst({
    where: { id: checkInId, businessId: membership.businessId },
  });
  if (!checkIn) return;
  // Delete your own check-in, or (as owner) anyone's — same pattern as
  // WRAP's deleteWeeklyCheckIn.
  if (checkIn.userId !== membership.userId && membership.role !== "OWNER") return;

  await prisma.monthlyCheckIn.delete({ where: { id: checkInId } });

  revalidatePath("/mrap");
  revalidatePath("/dashboard");
}

// Preview-only: /preview/submit-mrap still demos the old single
// company-wide text entry. The real app replaced this with
// createMonthlyCheckIn above; kept here only so that preview page compiles.
export async function saveMonthlyReview(formData: FormData) {
  const business = await requireBusiness();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const okrAveragePct = await currentOkrAverage(business.id);

  await prisma.monthlyReview.upsert({
    where: { businessId_month: { businessId: business.id, month } },
    create: {
      businessId: business.id,
      month,
      okrAveragePct,
      highlights: String(formData.get("highlights") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      priorities: String(formData.get("priorities") ?? "") || null,
    },
    update: {
      okrAveragePct,
      highlights: String(formData.get("highlights") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      priorities: String(formData.get("priorities") ?? "") || null,
    },
  });

  revalidatePath("/preview/submit-mrap");
  revalidatePath("/preview/mrap-review");
  revalidatePath("/preview/company-mrap");
  revalidatePath("/preview/rolling-performance-report");
}
