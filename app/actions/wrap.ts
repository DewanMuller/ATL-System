"use server";

import { revalidatePath } from "next/cache";
import type { RagStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalDate } from "@/lib/forms";
import { WELLBEING_MIN, WELLBEING_MAX } from "@/lib/wellbeing";

const RAG_TO_PERCENT: Record<RagStatus, number> = { GREEN: 100, AMBER: 50, RED: 0 };
const VALID_RAG = new Set<string>(["GREEN", "AMBER", "RED"]);

function readInitiativeFields(formData: FormData, initiativeId: string) {
  const statusRaw = String(formData.get(`status-${initiativeId}`) ?? "AMBER");
  const status: RagStatus = VALID_RAG.has(statusRaw) ? (statusRaw as RagStatus) : "AMBER";
  const blockers = String(formData.get(`blockers-${initiativeId}`) ?? "") || null;
  const priorities = String(formData.get(`priorities-${initiativeId}`) ?? "") || null;
  return { status, blockers, priorities };
}

// Each member submits their own check-in, tied to their own session — not a
// free-text name anyone could type. Resubmitting the same week updates it
// (see the @@unique([userId, weekOf]) constraint) rather than creating a
// duplicate, since this is meant to be correctable, not append-only.
//
// goalCompletionPct is no longer typed by hand: it's the average of this
// week's per-initiative RAG (GREEN=100/AMBER=50/RED=0) across everything the
// submitter owns, so "goal progress" reflects the same initiatives the rest
// of the form reports on rather than a separate, disconnected guess.
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
    select: { id: true },
  });
  const initiativeUpdates = myInitiatives.map((i) => ({ id: i.id, ...readInitiativeFields(formData, i.id) }));
  const goalCompletionPct =
    initiativeUpdates.length > 0
      ? initiativeUpdates.reduce((sum, u) => sum + RAG_TO_PERCENT[u.status], 0) / initiativeUpdates.length
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
        create: { weeklyCheckInId: checkIn.id, initiativeId: u.id, status: u.status, blockers: u.blockers, priorities: u.priorities },
        update: { status: u.status, blockers: u.blockers, priorities: u.priorities },
      });
    }
  });

  revalidatePath("/wrap");
  revalidatePath("/dashboard");
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
