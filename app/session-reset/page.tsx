"use client";

import { useEffect } from "react";
import { logout } from "@/app/actions/auth";

// A Server Component (app/(app)/layout.tsx) can't clear cookies itself —
// only a Server Action or Route Handler can. Redirecting straight to a
// Route Handler (an earlier version of this fix) worked for a full page
// load, but not for a client-side (RSC) navigation, which is how a user
// actually lands here in practice — right after signIn()'s router.push, or
// while already inside the app: Next.js's client router doesn't reliably
// apply Set-Cookie headers from a Route Handler encountered mid-navigation,
// so the invalid session cookie survived and the redirect loop continued.
// Calling the existing logout() Server Action from a mounted Client
// Component instead uses Next.js's own well-supported action+redirect
// path, which correctly clears cookies regardless of how this page was
// reached.
export default function SessionResetPage() {
  useEffect(() => {
    logout();
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Signing you out…</p>
    </div>
  );
}
