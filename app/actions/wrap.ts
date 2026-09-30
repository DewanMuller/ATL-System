"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalDate } from "@/lib/forms";
import { WELLBEING_MIN, WELLBEING_MAX } from "@/lib/wellbeing";

// Each member submits their own check-in, tied to their own session — not a
// free-text name anyone could type. Resubmitting the same week updates it
// (see the @@unique([userId, weekOf]) constraint) rather than creating a
// duplicate, since this is meant to be correctable, not append-only.
export async function createWeeklyCheckIn(formData: FormData) {
  const membership = await requireMembership();

  const weekOfRaw = String(formData.get("weekOf") ?? "");
  const wellbeingScore = Number(formData.get("wellbeingScore"));
  const goalCompletionPct = Number(formData.get("goalCompletionPct"));

  if (!weekOfRaw) return;
  const weekOf = parseOptionalDate(weekOfRaw);
  if (!weekOf) return;
  if (!Number.isFinite(wellbeingScore) || wellbeingScore < WELLBEING_MIN || wellbeingScore > WELLBEING_MAX) return;
  if (!Number.isFinite(goalCompletionPct) || goalCompletionPct < 0 || goalCompletionPct > 100) return;

  const data = {
    wellbeingScore,
    goalCompletionPct,
    highlights: String(formData.get("highlights") ?? "") || null,
    blockers: String(formData.get("blockers") ?? "") || null,
    priorities: String(formData.get("priorities") ?? "") || null,
  };

  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekOf: { userId: membership.userId, weekOf } },
    create: {
      businessId: membership.businessId,
      userId: membership.userId,
      weekOf,
      ...data,
    },
    update: data,
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
