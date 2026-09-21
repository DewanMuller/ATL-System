"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/business";
import { currentOkrAverage } from "@/lib/okr";

export async function saveMonthlyReview(formData: FormData) {
  const business = await requireBusiness();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const okrAveragePct = await currentOkrAverage(business.id);

  await prisma.monthlyReview.upsert({
    where: { businessId_month: { businessId: business.id, month } },
    create: {
      businessId: business.id,
      month,
      okrAveragePct,
      highlights: String(formData.get("highlights") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      priorities: String(formData.get("priorities") ?? "") || null,
    },
    update: {
      okrAveragePct,
      highlights: String(formData.get("highlights") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      priorities: String(formData.get("priorities") ?? "") || null,
    },
  });

  revalidatePath("/mrap");
  revalidatePath("/preview/submit-mrap");
  revalidatePath("/preview/mrap-review");
  revalidatePath("/preview/company-mrap");
  revalidatePath("/preview/rolling-performance-report");
}

export async function deleteMonthlyReview(reviewId: string) {
  const business = await requireBusiness();

  await prisma.monthlyReview.deleteMany({
    where: { id: reviewId, businessId: business.id },
  });

  revalidatePath("/mrap");
  revalidatePath("/preview/submit-mrap");
  revalidatePath("/preview/mrap-review");
  revalidatePath("/preview/company-mrap");
  revalidatePath("/preview/rolling-performance-report");
}
