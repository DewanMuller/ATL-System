"use server";

import { revalidatePath, refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { LETTER_TO_RACI_ROLE } from "@/lib/raci";

// Each cell is its own tiny form that auto-submits on change (same pattern
// as StatusSelect elsewhere in the app) — one cell, one write. An earlier
// version submitted the whole matrix as a single bulk "Save" form, which
// turned out to lose other cells' selections on save; per-cell saves have
// no such cross-cell interaction to get wrong.
export async function setRaciCell(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const objectiveId = String(formData.get("objectiveId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const letter = String(formData.get("role") ?? "");

  const [objective, isMember] = await Promise.all([
    prisma.objective.findFirst({
      where: { id: objectiveId, businessId: membership.businessId },
      select: { id: true },
    }),
    prisma.membership.findFirst({
      where: { businessId: membership.businessId, userId },
      select: { id: true },
    }),
  ]);
  if (!objective || !isMember) return;

  if (!letter) {
    await prisma.raciAssignment.deleteMany({ where: { objectiveId, userId } });
  } else {
    const role = LETTER_TO_RACI_ROLE[letter];
    if (!role) return;
    await prisma.raciAssignment.upsert({
      where: { objectiveId_userId: { objectiveId, userId } },
      create: { objectiveId, userId, role },
      update: { role },
    });
  }

  revalidatePath("/raci");
  revalidatePath("/preview/raci-matrix");
  refresh();
}
