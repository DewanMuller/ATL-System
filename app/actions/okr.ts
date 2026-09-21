"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalDate, parseOptionalFloat } from "@/lib/forms";
import { canEditOutcome } from "@/lib/okr";

async function isBusinessMember(businessId: string, userId: string) {
  const member = await prisma.membership.findFirst({ where: { businessId, userId } });
  return !!member;
}

// Weighting is entered in the UI as a whole percent (0–100) but stored as a
// 0–1 fraction (see schema comment on Objective.weighting).
function parseWeightingPercent(formData: FormData) {
  const raw = String(formData.get("weightingPercent") ?? "");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n / 100;
}

function clampPercent(n: number | null) {
  if (n === null) return null;
  return Math.max(0, Math.min(100, n));
}

async function getContributorIds(formData: FormData, businessId: string) {
  const submitted = formData.getAll("contributorIds").map(String).filter(Boolean);
  const valid: string[] = [];
  for (const id of submitted) {
    if (await isBusinessMember(businessId, id)) valid.push(id);
  }
  return valid;
}

// ---------- Objectives (Part A — structural changes, owner-only) ----------

export async function createObjective(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const code = String(formData.get("code") ?? "").trim() || null;

  const leadUserId = String(formData.get("leadUserId") ?? "");
  if (!leadUserId || !(await isBusinessMember(membership.businessId, leadUserId))) return;

  const alignedToObjectiveId = String(formData.get("alignedToObjectiveId") ?? "") || null;
  if (alignedToObjectiveId) {
    const parent = await prisma.objective.findFirst({
      where: { id: alignedToObjectiveId, businessId: membership.businessId },
    });
    if (!parent) return;
  }

  const weighting = parseWeightingPercent(formData);
  if (weighting === null) return;

  const periodType = String(formData.get("periodType") ?? "");
  if (periodType !== "YEAR" && periodType !== "QUARTER") return;

  const periodValue = String(formData.get("periodValue") ?? "").trim();
  if (!periodValue) return;

  const dueDate = parseOptionalDate(formData.get("dueDate"));
  if (!dueDate) return;

  const departmentId = String(formData.get("departmentId") ?? "") || null;
  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, businessId: membership.businessId },
    });
    if (!department) return;
  }
  const isTopCompanyOkr = formData.get("isTopCompanyOkr") === "on";
  const isTopDepartmentOkr = formData.get("isTopDepartmentOkr") === "on";

  const contributorIds = await getContributorIds(formData, membership.businessId);

  await prisma.objective.create({
    data: {
      businessId: membership.businessId,
      code,
      title,
      leadUserId,
      alignedToObjectiveId,
      weighting,
      periodType,
      periodValue,
      dueDate,
      departmentId,
      isTopCompanyOkr,
      isTopDepartmentOkr,
      contributors: { create: contributorIds.map((userId) => ({ userId })) },
    },
  });

  revalidatePath("/okrs");
  revalidatePath("/dashboard");
}

export async function updateObjective(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const objectiveId = String(formData.get("objectiveId") ?? "");
  const existing = await prisma.objective.findFirst({
    where: { id: objectiveId, businessId: membership.businessId },
  });
  if (!existing) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const code = String(formData.get("code") ?? "").trim() || null;

  const leadUserId = String(formData.get("leadUserId") ?? "");
  if (!leadUserId || !(await isBusinessMember(membership.businessId, leadUserId))) return;

  let alignedToObjectiveId = String(formData.get("alignedToObjectiveId") ?? "") || null;
  if (alignedToObjectiveId === objectiveId) alignedToObjectiveId = null; // can't align to itself
  if (alignedToObjectiveId) {
    const parent = await prisma.objective.findFirst({
      where: { id: alignedToObjectiveId, businessId: membership.businessId },
    });
    if (!parent) return;
  }

  const weighting = parseWeightingPercent(formData);
  if (weighting === null) return;

  const periodType = String(formData.get("periodType") ?? "");
  if (periodType !== "YEAR" && periodType !== "QUARTER") return;

  const periodValue = String(formData.get("periodValue") ?? "").trim();
  if (!periodValue) return;

  const dueDate = parseOptionalDate(formData.get("dueDate"));
  if (!dueDate) return;

  const departmentId = String(formData.get("departmentId") ?? "") || null;
  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, businessId: membership.businessId },
    });
    if (!department) return;
  }
  const isTopCompanyOkr = formData.get("isTopCompanyOkr") === "on";
  const isTopDepartmentOkr = formData.get("isTopDepartmentOkr") === "on";

  const contributorIds = await getContributorIds(formData, membership.businessId);

  await prisma.$transaction([
    prisma.objectiveContributor.deleteMany({ where: { objectiveId } }),
    prisma.objective.update({
      where: { id: objectiveId },
      data: {
        code,
        title,
        leadUserId,
        alignedToObjectiveId,
        weighting,
        periodType,
        periodValue,
        dueDate,
        departmentId,
        isTopCompanyOkr,
        isTopDepartmentOkr,
        contributors: { create: contributorIds.map((userId) => ({ userId })) },
      },
    }),
  ]);

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/dashboard");
}

export async function deleteObjective(objectiveId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  await prisma.objective.deleteMany({
    where: { id: objectiveId, businessId: membership.businessId },
  });

  revalidatePath("/okrs");
  revalidatePath("/dashboard");
  redirect("/okrs");
}

// ---------- Key Results ----------

export async function createKeyResult(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const objectiveId = String(formData.get("objectiveId") ?? "");
  const objective = await prisma.objective.findFirst({
    where: { id: objectiveId, businessId: membership.businessId },
  });
  if (!objective) return;

  const metric = String(formData.get("metric") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  if (!metric || !target) return;

  const responsibleUserId = String(formData.get("responsibleUserId") ?? "");
  if (!responsibleUserId || !(await isBusinessMember(membership.businessId, responsibleUserId))) return;

  await prisma.keyResult.create({
    data: { objectiveId, metric, target, responsibleUserId },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/dashboard");
}

export async function updateKeyResult(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const keyResultId = String(formData.get("keyResultId") ?? "");
  const existing = await prisma.keyResult.findFirst({
    where: { id: keyResultId, objective: { businessId: membership.businessId } },
  });
  if (!existing) return;

  const metric = String(formData.get("metric") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  if (!metric || !target) return;

  const responsibleUserId = String(formData.get("responsibleUserId") ?? "");
  if (!responsibleUserId || !(await isBusinessMember(membership.businessId, responsibleUserId))) return;

  await prisma.keyResult.update({
    where: { id: keyResultId },
    data: { metric, target, responsibleUserId },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/dashboard");
}

export async function deleteKeyResult(keyResultId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  await prisma.keyResult.deleteMany({
    where: { id: keyResultId, objective: { businessId: membership.businessId } },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/dashboard");
}

// Part B — restricted to the Objective's Lead, the Key Result's Responsible
// person, or an owner (see lib/okr.ts's canEditOutcome).
export async function updateKeyResultOutcome(formData: FormData) {
  const membership = await requireMembership();

  const keyResultId = String(formData.get("keyResultId") ?? "");
  const kr = await prisma.keyResult.findFirst({
    where: { id: keyResultId, objective: { businessId: membership.businessId } },
    include: { objective: { select: { leadUserId: true } } },
  });
  if (!kr) return;
  if (!canEditOutcome(membership, kr.objective, kr.responsibleUserId)) return;

  const outcomePercent = clampPercent(parseOptionalFloat(formData.get("outcomePercent")));
  const comments = String(formData.get("comments") ?? "") || null;

  await prisma.keyResult.update({
    where: { id: keyResultId },
    data: { outcomePercent, comments },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/dashboard");
  revalidatePath("/preview", "layout");
  refresh();
}

// ---------- Initiatives ----------

export async function createInitiative(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const keyResultId = String(formData.get("keyResultId") ?? "");
  const keyResult = await prisma.keyResult.findFirst({
    where: { id: keyResultId, objective: { businessId: membership.businessId } },
  });
  if (!keyResult) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const dueDate = parseOptionalDate(formData.get("dueDate"));
  if (!dueDate) return;

  const responsibleUserId = String(formData.get("responsibleUserId") ?? "");
  if (!responsibleUserId || !(await isBusinessMember(membership.businessId, responsibleUserId))) return;

  await prisma.initiative.create({
    data: { keyResultId, name, dueDate, responsibleUserId },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
}

export async function updateInitiative(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const initiativeId = String(formData.get("initiativeId") ?? "");
  const existing = await prisma.initiative.findFirst({
    where: { id: initiativeId, keyResult: { objective: { businessId: membership.businessId } } },
  });
  if (!existing) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const dueDate = parseOptionalDate(formData.get("dueDate"));
  if (!dueDate) return;

  const responsibleUserId = String(formData.get("responsibleUserId") ?? "");
  if (!responsibleUserId || !(await isBusinessMember(membership.businessId, responsibleUserId))) return;

  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { name, dueDate, responsibleUserId },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
}

export async function deleteInitiative(initiativeId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  await prisma.initiative.deleteMany({
    where: { id: initiativeId, keyResult: { objective: { businessId: membership.businessId } } },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
}

// Part B — restricted to the Objective's Lead, the Initiative's Responsible
// person, or an owner.
export async function updateInitiativeOutcome(formData: FormData) {
  const membership = await requireMembership();

  const initiativeId = String(formData.get("initiativeId") ?? "");
  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, keyResult: { objective: { businessId: membership.businessId } } },
    include: { keyResult: { include: { objective: { select: { leadUserId: true } } } } },
  });
  if (!initiative) return;
  if (!canEditOutcome(membership, initiative.keyResult.objective, initiative.responsibleUserId)) return;

  const outcomePercent = clampPercent(parseOptionalFloat(formData.get("outcomePercent")));
  const comments = String(formData.get("comments") ?? "") || null;

  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { outcomePercent, comments },
  });

  revalidatePath("/okrs");
  revalidatePath("/okrs/[id]", "page");
  revalidatePath("/preview", "layout");
  refresh();
}
