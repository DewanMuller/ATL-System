import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { EmailNotVerifiedNotice } from "@/components/EmailNotVerifiedNotice";
import { stopImpersonation } from "@/app/actions/admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, membership] = await Promise.all([
    auth(),
    getSessionMembership(),
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  // A valid, well-formed session with no matching Membership is an orphaned
  // session (see app/api/session-reset/route.ts) — redirecting straight to
  // /login here would loop forever, since proxy.ts would just see the
  // still-valid JWT and send them right back to /dashboard.
  if (!membership) {
    redirect("/api/session-reset");
  }

  const [business, currentUser] = await Promise.all([
    prisma.business.findUnique({
      where: { id: membership.businessId },
      select: { name: true },
    }),
    // Re-checked against the database rather than trusted from the JWT, so
    // revoking admin access hides the Admin link on the very next request
    // instead of waiting for the session to expire (see lib/admin.ts).
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true, emailVerifiedAt: true },
    }),
  ]);

  if (!business) {
    redirect("/api/session-reset");
  }

  const isImpersonating = membership.id === "impersonation";

  return (
    <div className="flex h-screen flex-col">
      {isImpersonating && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
          <span>
            Admin session — viewing <strong>{business.name}</strong> as its
            owner.
          </span>
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="rounded-md bg-amber-950/10 px-3 py-1 text-xs font-semibold hover:bg-amber-950/20"
            >
              Exit impersonation
            </button>
          </form>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          businessName={business.name}
          userLabel={session.user.name || session.user.email || "Account"}
          roleLabel={
            isImpersonating
              ? "Owner (Admin)"
              : membership.role === "OWNER"
                ? "Owner"
                : "Member"
          }
          isSuperAdmin={currentUser?.isSuperAdmin ?? false}
        />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            {currentUser?.emailVerifiedAt ? children : <EmailNotVerifiedNotice />}
          </div>
        </main>
      </div>
    </div>
  );
}
