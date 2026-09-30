"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalDate } from "@/lib/forms";
import { canEditOutcome } from "@/lib/okr";

// Anyone who can already edit an Initiative's Part B outcome (the
// Objective's Lead, or the Initiative's own Responsible person) can ask for
// its due date to move — see app/actions/okr.ts's updateInitiative, which
// keeps Part A (including dueDate) owner-only to edit directly.
export async function requestDueDateChange(formData: FormData) {
  const membership = await requireMembership();

  const initiativeId = String(formData.get("initiativeId") ?? "");
  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, keyResult: { objective: { businessId: membership.businessId } } },
    include: { keyResult: { include: { objective: { select: { leadUserId: true } } } } },
  });
  if (!initiative) return;
  if (!canEditOutcome(membership, initiative.keyResult.objective, initiative.responsibleUserId)) return;

  const requestedDueDate = parseOptionalDate(formData.get("requestedDueDate"));
  if (!requestedDueDate) return;

  const reason = String(formData.get("reason") ?? "").trim() || null;

  // One open request per initiative at a time — mirrors the "only one live
  // token/session" convention used elsewhere (password reset, impersonation).
  const alreadyPending = await prisma.dueDateChangeRequest.findFirst({
    where: { initiativeId, status: "PENDING" },
  });
  if (alreadyPending) return;

  await prisma.dueDateChangeRequest.create({
    data: {
      businessId: membership.businessId,
      initiativeId,
      requestedById: membership.userId,
      currentDueDate: initiative.dueDate,
      requestedDueDate,
      reason,
    },
  });

  revalidatePath("/due-date-approvals");
}

export async function approveDueDateChange(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const requestId = String(formData.get("requestId") ?? "");
  const request = await prisma.dueDateChangeRequest.findFirst({
    where: { id: requestId, businessId: membership.businessId, status: "PENDING" },
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.initiative.update({
      where: { id: request.initiativeId },
      data: { dueDate: request.requestedDueDate },
    }),
    prisma.dueDateChangeRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedById: membership.userId, decidedAt: new Date() },
    }),
  ]);

  revalidatePath("/due-date-approvals");
  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/focus-planning");
  revalidatePath("/dashboard");
}

export async function rejectDueDateChange(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const requestId = String(formData.get("requestId") ?? "");
  const request = await prisma.dueDateChangeRequest.findFirst({
    where: { id: requestId, businessId: membership.businessId, status: "PENDING" },
  });
  if (!request) return;

  await prisma.dueDateChangeRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", decidedById: membership.userId, decidedAt: new Date() },
  });

  revalidatePath("/due-date-approvals");
}
