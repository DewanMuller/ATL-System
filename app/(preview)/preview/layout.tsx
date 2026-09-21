import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PreviewSidebar } from "@/components/preview/PreviewSidebar";

// A design prototype, deliberately isolated from the real (app) route
// group: even once a page here reads real Prisma data (Dashboard, from
// Phase 5 on), the route itself stays separate from the live /dashboard,
// /okrs, /bhag etc. so nothing changes for real users until a page is
// explicitly cut over. Still auth-gated (reuses the same session check) so
// it isn't publicly reachable.
export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true },
      })
    : null;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-shrink-0 items-center justify-center gap-2 bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white">
        Design preview — every page here now shows your real business data,
        except Due Date Approvals (that workflow doesn&apos;t exist yet).
      </div>
      <div className="flex min-h-0 flex-1">
        <PreviewSidebar
          userLabel={session.user.name || session.user.email || "Account"}
          roleLabel="Preview"
          isSuperAdmin={user?.isSuperAdmin ?? false}
        />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
