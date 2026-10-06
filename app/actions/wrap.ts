"use server";

import { revalidatePath } from "next/cache";
import type { RagStatus, MeasureType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalDate, parseOptionalFloat } from "@/lib/forms";
import { WELLBEING_MIN, WELLBEING_MAX } from "@/lib/wellbeing";
import { computeOutcomePercent } from "@/lib/measure";
import { ragForPercent } from "@/components/preview/colors";

const RAG_TO_PERCENT: Record<RagStatus, number> = { GREEN: 100, AMBER: 50, RED: 0 };
const VALID_RAG = new Set<string>(["GREEN", "AMBER", "RED"]);

type OwnedInitiative = {
  id: string;
  measureType: MeasureType;
  targetValue: number | null;
  startValue: number | null;
};

// MANUAL initiatives keep today's hand-picked RAG. BINARY/NUMERIC ones
// report an actual value instead — the RAG and the week's outcomePercent
// are both derived from it (see lib/measure.ts), not chosen separately, so
// "how's it going" always matches the real number.
function readInitiativeFields(formData: FormData, initiative: OwnedInitiative) {
  const blockers = String(formData.get(`blockers-${initiative.id}`) ?? "") || null;
  const priorities = String(formData.get(`priorities-${initiative.id}`) ?? "") || null;

  if (initiative.measureType === "MANUAL") {
    const statusRaw = String(formData.get(`status-${initiative.id}`) ?? "AMBER");
    const status: RagStatus = VALID_RAG.has(statusRaw) ? (statusRaw as RagStatus) : "AMBER";
    return { id: initiative.id, status, reportedValue: null as number | null, measuredPercent: null as number | null, blockers, priorities };
  }

  const reportedValue = parseOptionalFloat(formData.get(`value-${initiative.id}`));
  const measuredPercent = computeOutcomePercent({
    measureType: initiative.measureType,
    startValue: initiative.startValue,
    targetValue: initiative.targetValue,
    currentValue: reportedValue,
  });
  const status: RagStatus = measuredPercent == null ? "AMBER" : ragForPercent(measuredPercent);
  return { id: initiative.id, status, reportedValue, measuredPercent, blockers, priorities };
}

// Each member submits their own check-in, tied to their own session — not a
// free-text name anyone could type. Resubmitting the same week updates it
// (see the @@unique([userId, weekOf]) constraint) rather than creating a
// duplicate, since this is meant to be correctable, not append-only.
//
// goalCompletionPct is no longer typed by hand: for MANUAL initiatives it's
// the RAG bucketed to a percent (GREEN=100/AMBER=50/RED=0) same as before;
// for BINARY/NUMERIC it uses the real computed percent instead of the
// bucketed approximation, since a real number is available.
export async function createWeeklyCheckIn(formData: FormData) {
  const membership = await requireMembership();

  const weekOfRaw = String(formData.get("weekOf") ?? "");
  const wellbeingScore = Number(formData.get("wellbeingScore"));

  if (!weekOfRaw) return;
  const weekOf = parseOptionalDate(weekOfRaw);
  if (!weekOf) return;
  if (!Number.isFinite(wellbeingScore) || wellbeingScore < WELLBEING_MIN || wellbeingScore > WELLBEING_MAX) return;

  // Re-fetch the submitter's owned initiatives server-side rather than
  // trusting whatever initiative ids the client posted, so someone can't
  // report progress on an initiative they don't own by crafting form fields.
  const myInitiatives = await prisma.initiative.findMany({
    where: { responsibleUserId: membership.userId, keyResult: { objective: { businessId: membership.businessId } } },
    select: { id: true, measureType: true, targetValue: true, startValue: true },
  });
  const initiativeUpdates = myInitiatives.map((i) => readInitiativeFields(formData, i));
  const goalCompletionPct =
    initiativeUpdates.length > 0
      ? initiativeUpdates.reduce((sum, u) => sum + (u.measuredPercent ?? RAG_TO_PERCENT[u.status]), 0) / initiativeUpdates.length
      : 0;

  const data = {
    wellbeingScore,
    goalCompletionPct,
    highlights: String(formData.get("highlights") ?? "") || null,
    blockers: String(formData.get("blockers") ?? "") || null,
    priorities: String(formData.get("priorities") ?? "") || null,
  };

  await prisma.$transaction(async (tx) => {
    const checkIn = await tx.weeklyCheckIn.upsert({
      where: { userId_weekOf: { userId: membership.userId, weekOf } },
      create: {
        businessId: membership.businessId,
        userId: membership.userId,
        weekOf,
        ...data,
      },
      update: data,
    });

    for (const u of initiativeUpdates) {
      await tx.initiativeCheckIn.upsert({
        where: { weeklyCheckInId_initiativeId: { weeklyCheckInId: checkIn.id, initiativeId: u.id } },
        create: {
          weeklyCheckInId: checkIn.id,
          initiativeId: u.id,
          status: u.status,
          reportedValue: u.reportedValue,
          blockers: u.blockers,
          priorities: u.priorities,
        },
        update: { status: u.status, reportedValue: u.reportedValue, blockers: u.blockers, priorities: u.priorities },
      });

      if (u.reportedValue != null) {
        await tx.initiative.update({
          where: { id: u.id },
          data: { currentValue: u.reportedValue, outcomePercent: u.measuredPercent },
        });
      }
    }
  });

  revalidatePath("/wrap");
  revalidatePath("/dashboard");
  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/my-work");
}

export async function deleteWeeklyCheckIn(checkInId: string) {
  const membership = await requireMembership();

  const checkIn = await prisma.weeklyCheckIn.findFirst({
    where: { id: checkInId, businessId: membership.businessId },
  });
  if (!checkIn) return;
  // Delete your own check-in, or (as owner) anyone's — same pattern as
  // canEditOutcome elsewhere, not left open to any business member.
  if (checkIn.userId !== membership.userId && membership.role !== "OWNER") return;

  await prisma.weeklyCheckIn.delete({ where: { id: checkInId } });

  revalidatePath("/wrap");
  revalidatePath("/dashboard");
}
