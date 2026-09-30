import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  // login/signup redirect an already-logged-in visitor to /dashboard —
  // forgot/reset-password don't, since a logged-in user resetting their
  // password (e.g. from a different device) is a normal, valid case.
  const isLoginOrSignup = pathname === "/login" || pathname === "/signup";
  const isPublicPage =
    isLoginOrSignup ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/session-reset";

  if (!isLoggedIn && !isPublicPage && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginOrSignup) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
