"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireMembership } from "@/lib/business";
import { currentQuarterString, shiftQuarter } from "@/lib/quarter";
import { parseOptionalDate } from "@/lib/forms";

const LEVELS = ["COMPANY", "DIVISIONAL", "ROLE"] as const;

export async function createIssue(formData: FormData) {
  const business = await requireBusiness();

  const title = String(formData.get("title") ?? "").trim();
  const accountableOwner = String(formData.get("accountableOwner") ?? "").trim();
  const levelRaw = String(formData.get("level") ?? "ROLE");
  if (!title || !accountableOwner) return;

  const level = (LEVELS as readonly string[]).includes(levelRaw)
    ? (levelRaw as (typeof LEVELS)[number])
    : "ROLE";

  await prisma.issue.create({
    data: { businessId: business.id, title, accountableOwner, level },
  });

  revalidatePath("/issues");
}

export async function saveDibrAnalysis(formData: FormData) {
  const business = await requireBusiness();

  const issueId = String(formData.get("issueId") ?? "");
  if (!issueId) return;

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, businessId: business.id },
  });
  if (!issue) return;

  const rootCause = String(formData.get("rootCause") ?? "") || null;
  const actionPlan = String(formData.get("actionPlan") ?? "") || null;

  await prisma.issue.update({
    where: { id: issueId },
    data: {
      rootCause,
      actionPlan,
      dibred: true,
      dibredAt: issue.dibredAt ?? new Date(),
    },
  });

  revalidatePath("/issues");
}

export async function setCeoApproval(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const issueId = String(formData.get("issueId") ?? "");
  const approved = String(formData.get("approved") ?? "") === "true";
  if (!issueId) return;

  await prisma.issue.updateMany({
    where: { id: issueId, businessId: membership.businessId },
    data: { ceoApproved: approved },
  });

  revalidatePath("/issues");
}

export async function convertIssueToNextStep(formData: FormData) {
  const business = await requireBusiness();

  const issueId = String(formData.get("issueId") ?? "");
  const objectiveId = String(formData.get("objectiveId") ?? "");
  if (!issueId || !objectiveId) return;

  const dueDate = parseOptionalDate(formData.get("dueDate"));

  // Transacted so the convertedNextStepId check and the write can't race —
  // two near-simultaneous submits would otherwise both pass the check
  // before either write lands, creating duplicate NextStep rows.
  await prisma.$transaction(async (tx) => {
    const [issue, objective] = await Promise.all([
      tx.issue.findFirst({ where: { id: issueId, businessId: business.id } }),
      tx.objective.findFirst({ where: { id: objectiveId, businessId: business.id } }),
    ]);
    if (!issue || !objective || issue.convertedNextStepId) return;

    const nextStep = await tx.nextStep.create({
      data: {
        businessId: business.id,
        objectiveId,
        title: issue.actionPlan || issue.title,
        owner: issue.accountableOwner,
        dueDate,
        notes: `Converted from DIBR issue: ${issue.title}`,
      },
    });

    await tx.issue.update({
      where: { id: issueId },
      data: { convertedNextStepId: nextStep.id },
    });
  });

  revalidatePath("/issues");
  revalidatePath("/dashboard");
}

export async function escalateIssueToQrap(formData: FormData) {
  const business = await requireBusiness();

  const issueId = String(formData.get("issueId") ?? "");
  if (!issueId) return;

  // Transacted for the same reason as convertIssueToNextStep — otherwise
  // concurrent submits can each pass the escalatedToQuarter check and
  // double-append the note into quarterlyReview.adjustments.
  await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.findFirst({
      where: { id: issueId, businessId: business.id },
    });
    if (!issue || issue.escalatedToQuarter || issue.convertedNextStepId) return;

    const nextQuarter = shiftQuarter(currentQuarterString(), 1);
    const note = `[${issue.level}] ${issue.title} — root cause: ${
      issue.rootCause || "n/a"
    }. Owner: ${issue.accountableOwner}.`;

    const existing = await tx.quarterlyReview.findUnique({
      where: { businessId_quarter: { businessId: business.id, quarter: nextQuarter } },
    });

    await tx.quarterlyReview.upsert({
      where: { businessId_quarter: { businessId: business.id, quarter: nextQuarter } },
      create: {
        businessId: business.id,
        quarter: nextQuarter,
        adjustments: note,
      },
      update: {
        adjustments: existing?.adjustments ? `${existing.adjustments}\n${note}` : note,
      },
    });

    await tx.issue.update({
      where: { id: issueId },
      data: { escalatedToQuarter: nextQuarter },
    });
  });

  revalidatePath("/issues");
  revalidatePath("/qrap");
}

export async function deleteIssue(issueId: string) {
  const business = await requireBusiness();

  await prisma.issue.deleteMany({
    where: { id: issueId, businessId: business.id },
  });

  revalidatePath("/issues");
}
