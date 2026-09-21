"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/business";
import { currentOkrAverage } from "@/lib/okr";
import { isValidQuarter } from "@/lib/quarter";

export async function saveQuarterlyReview(formData: FormData) {
  const business = await requireBusiness();

  const quarter = String(formData.get("quarter") ?? "");
  if (!isValidQuarter(quarter)) return;

  const okrAveragePct = await currentOkrAverage(business.id);

  await prisma.quarterlyReview.upsert({
    where: { businessId_quarter: { businessId: business.id, quarter } },
    create: {
      businessId: business.id,
      quarter,
      okrAveragePct,
      businessSummary: String(formData.get("businessSummary") ?? "") || null,
      adjustments: String(formData.get("adjustments") ?? "") || null,
      nextQuarterFocus: String(formData.get("nextQuarterFocus") ?? "") || null,
    },
    update: {
      okrAveragePct,
      businessSummary: String(formData.get("businessSummary") ?? "") || null,
      adjustments: String(formData.get("adjustments") ?? "") || null,
      nextQuarterFocus: String(formData.get("nextQuarterFocus") ?? "") || null,
    },
  });

  revalidatePath("/qrap");
}

export async function deleteQuarterlyReview(reviewId: string) {
  const business = await requireBusiness();

  await prisma.quarterlyReview.deleteMany({
    where: { id: reviewId, businessId: business.id },
  });

  revalidatePath("/qrap");
}
