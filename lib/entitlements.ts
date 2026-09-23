import { prisma } from "@/lib/prisma";

export const ATL_PRODUCT_SLUG = "atl";

// Every page/section in ATL passes its own key when checking access, even
// though today they all resolve off the single suite-wide Entitlement row.
// If pricing later splits the suite (e.g. WRAP sold separately from OKRs),
// only isModuleEntitled needs to change — no call site does.
export type AtlModuleKey =
  | "bhag"
  | "okrs"
  | "winningMoves"
  | "nextSteps"
  | "wrap"
  | "mrap"
  | "qrap"
  | "issues";

export type AtlEntitlement = { active: boolean } | null;

export async function getAtlEntitlement(
  businessId: string
): Promise<AtlEntitlement> {
  const entitlement = await prisma.entitlement.findFirst({
    where: { businessId, product: { slug: ATL_PRODUCT_SLUG } },
    select: { active: true },
  });
  return entitlement;
}

export function isModuleEntitled(
  entitlement: AtlEntitlement,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for future per-module resolution
  moduleKey: AtlModuleKey
): boolean {
  return entitlement?.active ?? false;
}

// Combines getAtlEntitlement + isModuleEntitled into the single call every
// page needs — one place to change if entitlement resolution ever gets more
// complex (e.g. per-module billing), and one less place for a page to get
// subtly wrong by calling the two functions separately.
export async function isBusinessEntitled(
  businessId: string,
  moduleKey: AtlModuleKey
): Promise<boolean> {
  const entitlement = await getAtlEntitlement(businessId);
  return isModuleEntitled(entitlement, moduleKey);
}
