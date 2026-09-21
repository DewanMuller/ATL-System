import { cookies } from "next/headers";

// httpOnly cookie holding the businessId a super admin is currently viewing
// as its owner. Deliberately kept out of the NextAuth JWT so granting/
// revoking admin status takes effect immediately (see lib/business.ts,
// which re-checks isSuperAdmin against the database on every read).
export const IMPERSONATION_COOKIE = "atl_impersonate_business_id";

export async function getImpersonatedBusinessId() {
  const store = await cookies();
  return store.get(IMPERSONATION_COOKIE)?.value ?? null;
}
