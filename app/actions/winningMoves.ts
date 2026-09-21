"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireMembership } from "@/lib/business";
import { parseOptionalDate } from "@/lib/forms";
import { resolveAssigneeId } from "@/lib/assignees";

export async function createWinningMove(formData: FormData) {
  const membership = await requireMembership();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const objectiveId = String(formData.get("objectiveId") ?? "") || null;
  if (objectiveId) {
    const objective = await prisma.objective.findFirst({
      where: { id: objectiveId, businessId: membership.businessId },
    });
    if (!objective) return;
  }

  const status = String(formData.get("status") ?? "AMBER");
  const validStatus = ["RED", "AMBER", "GREEN"].includes(status)
    ? (status as "RED" | "AMBER" | "GREEN")
    : "AMBER";

  const assigneeId =
    membership.role === "OWNER"
      ? await resolveAssigneeId(membership.businessId, formData)
      : membership.userId;

  await prisma.winningMove.create({
    data: {
      businessId: membership.businessId,
      title,
      description: String(formData.get("description") ?? "") || null,
      objectiveId,
      assigneeId,
      dueDate: parseOptionalDate(formData.get("dueDate")),
      status: validStatus,
    },
  });

  revalidatePath("/winning-moves");
  revalidatePath("/dashboard");
}

export async function updateWinningMoveStatus(formData: FormData) {
  const business = await requireBusiness();

  const winningMoveId = String(formData.get("winningMoveId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!winningMoveId || !["RED", "AMBER", "GREEN"].includes(status)) return;

  await prisma.winningMove.updateMany({
    where: { id: winningMoveId, businessId: business.id },
    data: { status: status as "RED" | "AMBER" | "GREEN" },
  });

  revalidatePath("/winning-moves");
  revalidatePath("/dashboard");
  revalidatePath("/preview/winning-moves");
}

export async function updateWinningMoveAssignee(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const winningMoveId = String(formData.get("winningMoveId") ?? "");
  if (!winningMoveId) return;

  const assigneeId = await resolveAssigneeId(membership.businessId, formData);

  await prisma.winningMove.updateMany({
    where: { id: winningMoveId, businessId: membership.businessId },
    data: { assigneeId },
  });

  revalidatePath("/winning-moves");
  revalidatePath("/dashboard");
  revalidatePath("/preview/winning-moves");
}

export async function deleteWinningMove(winningMoveId: string) {
  const business = await requireBusiness();

  await prisma.winningMove.deleteMany({
    where: { id: winningMoveId, businessId: business.id },
  });

  revalidatePath("/winning-moves");
  revalidatePath("/dashboard");
}
