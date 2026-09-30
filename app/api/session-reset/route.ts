import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";

// A JWT session can be well-formed (so proxy.ts's cheap `!!req.auth` check
// treats it as logged in) while its underlying Membership no longer exists
// — e.g. the business was removed, or the account's data changed after the
// session was issued. app/(app)/layout.tsx redirects here instead of
// straight to /login for that case, because a Server Component can't clear
// cookies itself (Next.js only allows cookie mutation in a Server Action or
// Route Handler). Redirecting straight to /login without clearing the
// cookie would just have proxy.ts see the still-valid JWT and bounce the
// user right back to /dashboard — an infinite redirect loop, breakable
// (from the user's side) only by manually clearing cookies.
export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("authjs.session-token");
  cookieStore.delete("__Secure-authjs.session-token");
  cookieStore.delete(IMPERSONATION_COOKIE);

  return NextResponse.redirect(new URL("/login", request.url));
}
