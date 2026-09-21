"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/business";
import { parseOptionalFloat } from "@/lib/forms";

function refresh() {
  revalidatePath("/bhag");
  revalidatePath("/dashboard");
}

// ---------- Vision statement ----------

export async function updateBhagVision(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim() || null;

  await prisma.bhag.upsert({
    where: { businessId: membership.businessId },
    create: { businessId: membership.businessId, title, description },
    update: { title, description },
  });

  refresh();
}

// ---------- Periods (scorecard columns) ----------

export async function createBhagPeriod(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const maxOrder = await prisma.bhagPeriod.aggregate({
    where: { businessId: membership.businessId },
    _max: { order: true },
  });

  await prisma.bhagPeriod.create({
    data: {
      businessId: membership.businessId,
      label,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  refresh();
}

export async function updateBhagPeriod(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const periodId = String(formData.get("periodId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  await prisma.bhagPeriod.updateMany({
    where: { id: periodId, businessId: membership.businessId },
    data: { label },
  });

  refresh();
}

export async function deleteBhagPeriod(periodId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  await prisma.bhagPeriod.deleteMany({
    where: { id: periodId, businessId: membership.businessId },
  });

  refresh();
}

// ---------- Metrics (scorecard rows) ----------

export async function createBhagMetric(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const category = String(formData.get("category") ?? "").trim() || null;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  const maxOrder = await prisma.bhagMetric.aggregate({
    where: { businessId: membership.businessId },
    _max: { order: true },
  });

  await prisma.bhagMetric.create({
    data: {
      businessId: membership.businessId,
      name,
      category,
      unit,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  refresh();
}

export async function updateBhagMetric(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const metricId = String(formData.get("metricId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const category = String(formData.get("category") ?? "").trim() || null;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  await prisma.bhagMetric.updateMany({
    where: { id: metricId, businessId: membership.businessId },
    data: { name, category, unit },
  });

  refresh();
}

export async function deleteBhagMetric(metricId: string) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  await prisma.bhagMetric.deleteMany({
    where: { id: metricId, businessId: membership.businessId },
  });

  refresh();
}

// ---------- Targets (one cell: a metric at a period) ----------

export async function updateBhagTarget(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const metricId = String(formData.get("metricId") ?? "");
  const periodId = String(formData.get("periodId") ?? "");
  const value = parseOptionalFloat(formData.get("value"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const [metric, period] = await Promise.all([
    prisma.bhagMetric.findFirst({
      where: { id: metricId, businessId: membership.businessId },
      select: { id: true },
    }),
    prisma.bhagPeriod.findFirst({
      where: { id: periodId, businessId: membership.businessId },
      select: { id: true },
    }),
  ]);
  if (!metric || !period) return;

  if (value == null && !note) {
    await prisma.bhagMetricTarget.deleteMany({ where: { metricId, periodId } });
  } else {
    await prisma.bhagMetricTarget.upsert({
      where: { metricId_periodId: { metricId, periodId } },
      create: { metricId, periodId, value, note },
      update: { value, note },
    });
  }

  refresh();
}

// ---------- Actual (the metric's current real-world value) ----------

export async function updateBhagActual(formData: FormData) {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") return;

  const metricId = String(formData.get("metricId") ?? "");
  const value = parseOptionalFloat(formData.get("value"));

  const metric = await prisma.bhagMetric.findFirst({
    where: { id: metricId, businessId: membership.businessId },
    select: { id: true },
  });
  if (!metric) return;

  await prisma.$transaction([
    prisma.bhagMetric.update({ where: { id: metricId }, data: { currentValue: value } }),
    prisma.bhagMetricSnapshot.create({ data: { metricId, value } }),
  ]);

  refresh();
}
