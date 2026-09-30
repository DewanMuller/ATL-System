import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin";
import {
  startImpersonation,
  stopImpersonation,
  setAtlEntitlement,
  findRemovableUser,
  removeUserAccount,
} from "@/app/actions/admin";
import { getImpersonatedBusinessId } from "@/lib/impersonation";
import { ATL_PRODUCT_SLUG } from "@/lib/entitlements";
import { logout } from "@/app/actions/auth";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lookupEmail?: string }>;
}) {
  await requireSuperAdmin();

  const { lookupEmail } = await searchParams;

  const [businesses, impersonatingBusinessId, lookupResult] = await Promise.all([
    prisma.business.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        members: { select: { id: true } },
        entitlements: {
          include: { product: { select: { slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getImpersonatedBusinessId(),
    lookupEmail ? findRemovableUser(lookupEmail) : null,
  ]);

  const activeCount = businesses.filter((b) =>
    b.entitlements.some((e) => e.product.slug === ATL_PRODUCT_SLUG && e.active)
  ).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All companies registered on Above The Line.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {impersonatingBusinessId && (
            <form action={stopImpersonation}>
              <button
                type="submit"
                className="rounded-md border border-black/10 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Exit impersonation
              </button>
            </form>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Companies", businesses.length],
          ["Active on ATL", activeCount],
          ["Inactive", businesses.length - activeCount],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
          >
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Members</th>
              <th className="px-4 py-2">Join code</th>
              <th className="px-4 py-2">ATL</th>
              <th className="px-4 py-2">Registered</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => {
              const atlEntitlement = b.entitlements.find(
                (e) => e.product.slug === ATL_PRODUCT_SLUG
              );
              const isActive = atlEntitlement?.active ?? false;
              return (
                <tr
                  key={b.id}
                  className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                >
                  <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                    <Link href={`/admin/business/${b.id}`} className="hover:underline">
                      {b.name}
                    </Link>
                    {b.id === impersonatingBusinessId && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Impersonating
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    {b.owner.name || b.owner.email}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    {b.members.length}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
                      {b.joinCode}
                    </code>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <form action={setAtlEntitlement}>
                        <input type="hidden" name="businessId" value={b.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={isActive ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-black/10 px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    {formatDate(b.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={startImpersonation}>
                      <input type="hidden" name="businessId" value={b.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-black/10 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
                      >
                        Log in as owner
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {businesses.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No companies registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Free up an email
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A user&apos;s email belongs to exactly one business, permanently — there&apos;s no
          self-service way to leave. Look up an email here to see what&apos;s tied to it and,
          if it&apos;s safe, remove the account so they can sign up fresh elsewhere.
        </p>

        <form method="GET" className="mt-4 flex gap-2">
          <input
            type="email"
            name="lookupEmail"
            defaultValue={lookupEmail}
            placeholder="person@example.com"
            className="w-full max-w-xs rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
          >
            Look up
          </button>
        </form>

        {lookupResult && !lookupResult.found && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No account with that email.
          </p>
        )}

        {lookupResult?.found && (
          <div className="mt-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
            <p className="text-zinc-800 dark:text-zinc-200">
              {lookupResult.name || lookupResult.email} —{" "}
              {lookupResult.businessName ? (
                <>
                  {lookupResult.role === "OWNER" ? "owns" : "member of"}{" "}
                  <strong>{lookupResult.businessName}</strong>
                </>
              ) : (
                "no business membership"
              )}
            </p>

            {lookupResult.blockedReasons.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">
                {lookupResult.blockedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            {lookupResult.canRemove && (
              <form action={removeUserAccount} className="mt-3">
                <input type="hidden" name="userId" value={lookupResult.userId} />
                <button
                  type="submit"
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Remove account
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
