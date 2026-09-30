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
  if (!user?.isSuperAdmin) redirect("/dashboard");

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

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;

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

// A Membership is one-per-user by design (see prisma/schema.prisma) — a
// business is sold to one company, and a person's email belongs to exactly
// one of them. There's no self-service "leave a business" flow, so when a
// user needs to move their email to a different business (job change,
// wrong email at signup), a super admin has to free it up here.
//
// signup() blocks on the User row existing at all (not just on a
// Membership), so removing only the Membership wouldn't free the email —
// the User has to go. That's only safe when deleting them can't cascade
// into deleting real business data: Objective.leadUserId,
// KeyResult.responsibleUserId and Initiative.responsibleUserId are all
// onDelete: Cascade, so a user who leads objectives or owns key
// results/initiatives takes that work down with them. An OWNER is never
// removable this way at all — Business.ownerId is also onDelete: Cascade,
// so deleting an owner deletes their entire business.
export async function findRemovableUser(email: string) {
  await requireSuperAdminUserId();

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      membership: { include: { business: { select: { name: true } } } },
      _count: {
        select: {
          ledObjectives: true,
          responsibleKeyResults: true,
          responsibleInitiatives: true,
        },
      },
    },
  });
  if (!user) return { found: false as const };

  const blockedReasons: string[] = [];
  if (user.membership?.role === "OWNER") {
    blockedReasons.push(
      `They own the business "${user.membership.business.name}" — removing an owner would delete the entire business.`
    );
  }
  if (user._count.ledObjectives > 0) {
    blockedReasons.push(`They lead ${user._count.ledObjectives} objective(s).`);
  }
  if (user._count.responsibleKeyResults > 0) {
    blockedReasons.push(`They're responsible for ${user._count.responsibleKeyResults} key result(s).`);
  }
  if (user._count.responsibleInitiatives > 0) {
    blockedReasons.push(`They're responsible for ${user._count.responsibleInitiatives} initiative(s).`);
  }

  return {
    found: true as const,
    userId: user.id,
    email: user.email,
    name: user.name,
    businessName: user.membership?.business.name ?? null,
    role: user.membership?.role ?? null,
    canRemove: blockedReasons.length === 0,
    blockedReasons,
  };
}

export async function removeUserAccount(formData: FormData) {
  await requireSuperAdminUserId();

  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      membership: true,
      _count: {
        select: { ledObjectives: true, responsibleKeyResults: true, responsibleInitiatives: true },
      },
    },
  });
  if (!user) return;
  // Re-checked here even though the UI only shows this action when safe —
  // never trust a client-submitted userId alone for a destructive action.
  if (user.membership?.role === "OWNER") return;
  if (
    user._count.ledObjectives > 0 ||
    user._count.responsibleKeyResults > 0 ||
    user._count.responsibleInitiatives > 0
  ) {
    return;
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin");
}
