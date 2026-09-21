"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { ATL_PRODUCT_SLUG } from "@/lib/entitlements";

async function requireSuperAdminUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) throw new Error("Not authorized");

  return user.id;
}

export async function startImpersonation(formData: FormData) {
  const adminId = await requireSuperAdminUserId();

  const businessId = String(formData.get("businessId") ?? "");
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;

  // Only one open impersonation session per admin at a time, so the audit
  // trail never has two rows claiming to be "current" simultaneously.
  await prisma.impersonationLog.updateMany({
    where: { adminId, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prisma.impersonationLog.create({
    data: { adminId, businessId },
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/dashboard");
}

export async function setAtlEntitlement(formData: FormData) {
  await requireSuperAdminUserId();

  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) return;
  const active = String(formData.get("active") ?? "") === "true";

  const product = await prisma.product.upsert({
    where: { slug: ATL_PRODUCT_SLUG },
    create: { slug: ATL_PRODUCT_SLUG, name: "Above The Line" },
    update: {},
  });

  await prisma.entitlement.upsert({
    where: { businessId_productId: { businessId, productId: product.id } },
    create: { businessId, productId: product.id, active },
    update: { active, deactivatedAt: active ? null : new Date() },
  });

  revalidatePath("/admin");
  revalidatePath("/preview/admin");
}

export async function stopImpersonation() {
  const adminId = await requireSuperAdminUserId();

  await prisma.impersonationLog.updateMany({
    where: { adminId, endedAt: null },
    data: { endedAt: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);

  redirect("/admin");
}
