import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import { setMembershipRole, startImpersonation } from "@/app/actions/admin";

export default async function AdminBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  await requireSuperAdmin();
  const { businessId } = await params;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!business) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-8">
        <Link href="/admin" className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400">
          ← Back to Admin
        </Link>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No business found.</p>
      </div>
    );
  }

  const ownerCount = business.members.filter((m) => m.role === "OWNER").length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-8">
      <Link href="/admin" className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400">
        ← Back to Admin
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {business.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {business.members.length} member{business.members.length === 1 ? "" : "s"} ·{" "}
            {ownerCount} owner{ownerCount === 1 ? "" : "s"}
          </p>
        </div>
        <form action={startImpersonation}>
          <input type="hidden" name="businessId" value={business.id} />
          <button
            type="submit"
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
          >
            Log in as owner
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="border-b border-black/10 p-5 dark:border-white/10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Team &amp; roles</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Owner sees the full business — every objective, all reporting, and manages the
            join code and entitlements. A business can have more than one Owner (e.g. an
            exec team) — every business must keep at least one.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {business.members.map((m) => {
            const isLastOwner = m.role === "OWNER" && ownerCount <= 1;
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="text-zinc-800 dark:text-zinc-200">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-zinc-400">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      m.role === "OWNER"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {m.role === "OWNER" ? "Owner" : "Member"}
                  </span>
                  <form action={setMembershipRole}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <input type="hidden" name="role" value={m.role === "OWNER" ? "MEMBER" : "OWNER"} />
                    <button
                      type="submit"
                      disabled={isLastOwner}
                      title={isLastOwner ? "A business must keep at least one Owner" : undefined}
                      className="rounded-md border border-black/10 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-zinc-900"
                    >
                      {m.role === "OWNER" ? "Make Member" : "Make Owner"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
