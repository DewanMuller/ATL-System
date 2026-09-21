"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/business";

export async function createWeeklyCheckIn(formData: FormData) {
  const business = await requireBusiness();

  const personName = String(formData.get("personName") ?? "").trim();
  const weekOfRaw = String(formData.get("weekOf") ?? "");
  const wellbeingScore = Number(formData.get("wellbeingScore"));
  const goalCompletionPct = Number(formData.get("goalCompletionPct"));

  if (!personName || !weekOfRaw) return;
  const weekOf = new Date(weekOfRaw);
  if (Number.isNaN(weekOf.getTime())) return;
  if (!Number.isFinite(wellbeingScore) || wellbeingScore < 1 || wellbeingScore > 5)
    return;
  if (!Number.isFinite(goalCompletionPct)) return;

  await prisma.weeklyCheckIn.create({
    data: {
      businessId: business.id,
      personName,
      weekOf,
      wellbeingScore,
      goalCompletionPct,
      highlights: String(formData.get("highlights") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      priorities: String(formData.get("priorities") ?? "") || null,
    },
  });

  revalidatePath("/wrap");
}

export async function deleteWeeklyCheckIn(checkInId: string) {
  const business = await requireBusiness();

  await prisma.weeklyCheckIn.deleteMany({
    where: { id: checkInId, businessId: business.id },
  });

  revalidatePath("/wrap");
}
