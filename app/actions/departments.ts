"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";

export async function createDepartment(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;

  const maxOrder = await prisma.department.aggregate({
    where: { businessId: membership.businessId },
    _max: { order: true },
  });

  await prisma.department.create({
    data: {
      businessId: membership.businessId,
      code,
      name,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/okrs");
}

export async function updateDepartment(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const departmentId = String(formData.get("departmentId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;

  await prisma.department.updateMany({
    where: { id: departmentId, businessId: membership.businessId },
    data: { code, name },
  });

  revalidatePath("/okrs");
}

export async function deleteDepartment(departmentId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, businessId: membership.businessId },
    select: { id: true },
  });
  if (!department) return;

  // No DB-level FK/cascade on Objective.departmentId (see schema comment) —
  // null it out by hand before deleting, so objectives don't end up
  // pointing at a department that no longer exists.
  await prisma.$transaction([
    prisma.objective.updateMany({
      where: { departmentId },
      data: { departmentId: null },
    }),
    prisma.department.delete({ where: { id: departmentId } }),
  ]);

  revalidatePath("/okrs");
}
