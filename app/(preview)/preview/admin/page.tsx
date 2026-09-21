import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  startImpersonation,
  stopImpersonation,
  setAtlEntitlement,
} from "@/app/actions/admin";
import { getImpersonatedBusinessId } from "@/lib/impersonation";
import { ATL_PRODUCT_SLUG } from "@/lib/entitlements";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function PreviewAdminPage() {
  await requireSuperAdmin();

  const [businesses, impersonatingBusinessId] = await Promise.all([
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
  ]);

  const activeCount = businesses.filter((b) =>
    b.entitlements.some((e) => e.product.slug === ATL_PRODUCT_SLUG && e.active)
  ).length;

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All companies registered on Above The Line.
          </p>
        </div>
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
                    {b.name}
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
    </div>
  );
}
