import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAtlEntitlement } from "@/lib/entitlements";
import { getImpersonatedBusinessId } from "@/lib/impersonation";

// When a super admin is impersonating a business, they act with OWNER
// rights over it — this is the one place that decision is made, so every
// page/action built on getSessionMembership()/requireBusiness() picks it up
// automatically. isSuperAdmin is re-checked against the database here
// (not trusted from the JWT) so revoking admin access ends any live
// impersonation on the next request.
async function getImpersonatedMembership(userId: string) {
  const impersonatedBusinessId = await getImpersonatedBusinessId();
  if (!impersonatedBusinessId) return null;

  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  if (!admin?.isSuperAdmin) return null;

  const business = await prisma.business.findUnique({
    where: { id: impersonatedBusinessId },
    select: { id: true },
  });
  if (!business) return null;

  return {
    id: "impersonation",
    userId,
    businessId: business.id,
    role: "OWNER" as const,
    createdAt: new Date(),
  };
}

export async function getSessionMembership() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const impersonated = await getImpersonatedMembership(session.user.id);
  if (impersonated) return impersonated;

  const membership = await prisma.membership.findUnique({
    where: { userId: session.user.id },
  });
  if (!membership) return null;

  return { ...membership, userId: session.user.id };
}

export async function getSessionBusinessId() {
  const membership = await getSessionMembership();
  return membership?.businessId ?? null;
}

// Used by server actions (mutations), not by page rendering — an inactive
// entitlement here is treated as a hard error, not a friendly empty state,
// since a request reaching an action without the page's own entitlement
// check passing is an abuse case, not normal navigation.
export async function requireMembership() {
  const membership = await getSessionMembership();
  if (!membership) throw new Error("No business found for this account");

  const entitlement = await getAtlEntitlement(membership.businessId);
  if (!entitlement?.active) {
    throw new Error("Above The Line is not active on this account");
  }

  return membership;
}

export async function requireBusiness() {
  const membership = await requireMembership();

  const business = await prisma.business.findUnique({
    where: { id: membership.businessId },
  });
  if (!business) throw new Error("No business found for this account");

  return business;
}
