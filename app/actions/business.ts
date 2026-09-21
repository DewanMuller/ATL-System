"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireMembership } from "@/lib/business";
import { parseOptionalDate } from "@/lib/forms";
import { generateJoinCode } from "@/lib/joinCode";
import { resolveAssigneeId } from "@/lib/assignees";

// ---------- Team ----------

export async function regenerateJoinCode() {
  const business = await requireBusiness();

  await prisma.business.update({
    where: { id: business.id },
    data: { joinCode: generateJoinCode() },
  });

  revalidatePath("/dashboard");
}

// ---------- Next Steps ----------

export async function createNextStep(formData: FormData) {
  const membership = await requireMembership();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const keyResultId = String(formData.get("keyResultId") ?? "") || null;

  let objectiveId: string | null = null;
  let weeklyCheckInId: string | null = null;
  let monthlyReviewId: string | null = null;
  let quarterlyReviewId: string | null = null;
  let otherContext: string | null = null;

  if (keyResultId) {
    // The "add initiative" flow on the OKR page always targets a specific KR
    // and never submits a contextType — it's implicitly OKR context.
    const keyResult = await prisma.keyResult.findFirst({
      where: { id: keyResultId, objective: { businessId: membership.businessId } },
    });
    if (!keyResult) return;
    objectiveId = keyResult.objectiveId;
  } else {
    const contextType = String(formData.get("contextType") ?? "OKR");

    if (contextType === "WRAP") {
      const id = String(formData.get("weeklyCheckInId") ?? "") || null;
      if (!id) return;
      const found = await prisma.weeklyCheckIn.findFirst({
        where: { id, businessId: membership.businessId },
      });
      if (!found) return;
      weeklyCheckInId = id;
    } else if (contextType === "MRAP") {
      const id = String(formData.get("monthlyReviewId") ?? "") || null;
      if (!id) return;
      const found = await prisma.monthlyReview.findFirst({
        where: { id, businessId: membership.businessId },
      });
      if (!found) return;
      monthlyReviewId = id;
    } else if (contextType === "QRAP") {
      const id = String(formData.get("quarterlyReviewId") ?? "") || null;
      if (!id) return;
      const found = await prisma.quarterlyReview.findFirst({
        where: { id, businessId: membership.businessId },
      });
      if (!found) return;
      quarterlyReviewId = id;
    } else if (contextType === "OTHER") {
      const name = String(formData.get("otherContext") ?? "").trim();
      if (!name) return;
      otherContext = name;
    } else {
      objectiveId = String(formData.get("objectiveId") ?? "") || null;
      if (objectiveId) {
        const objective = await prisma.objective.findFirst({
          where: { id: objectiveId, businessId: membership.businessId },
        });
        if (!objective) return;
      }
    }
  }

  const status = String(formData.get("status") ?? "AMBER");
  const validStatus = ["RED", "AMBER", "GREEN"].includes(status)
    ? (status as "RED" | "AMBER" | "GREEN")
    : "AMBER";

  const assigneeId =
    membership.role === "OWNER"
      ? await resolveAssigneeId(membership.businessId, formData)
      : membership.userId;

  await prisma.nextStep.create({
    data: {
      businessId: membership.businessId,
      objectiveId,
      keyResultId,
      weeklyCheckInId,
      monthlyReviewId,
      quarterlyReviewId,
      otherContext,
      title,
      assigneeId,
      dueDate: parseOptionalDate(formData.get("dueDate")),
      status: validStatus,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidatePath("/next-steps");
  revalidatePath("/okrs");
  revalidatePath("/dashboard");
}

export async function updateNextStepStatus(formData: FormData) {
  const business = await requireBusiness();

  const nextStepId = String(formData.get("nextStepId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!nextStepId || !["RED", "AMBER", "GREEN"].includes(status)) return;

  await prisma.nextStep.updateMany({
    where: { id: nextStepId, businessId: business.id },
    data: { status: status as "RED" | "AMBER" | "GREEN" },
  });

  revalidatePath("/next-steps");
  revalidatePath("/dashboard");
  revalidatePath("/preview/next-steps");
}

export async function updateNextStepAssignee(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const nextStepId = String(formData.get("nextStepId") ?? "");
  if (!nextStepId) return;

  const assigneeId = await resolveAssigneeId(membership.businessId, formData);

  await prisma.nextStep.updateMany({
    where: { id: nextStepId, businessId: membership.businessId },
    data: { assigneeId },
  });

  revalidatePath("/next-steps");
  revalidatePath("/dashboard");
  revalidatePath("/preview/next-steps");
}

export async function deleteNextStep(nextStepId: string) {
  const business = await requireBusiness();

  await prisma.nextStep.deleteMany({
    where: { id: nextStepId, businessId: business.id },
  });

  revalidatePath("/next-steps");
  revalidatePath("/okrs");
  revalidatePath("/dashboard");
}
