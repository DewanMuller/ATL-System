import { RACI_LETTER, RACI_LABEL, RACI_STYLES, accountableWarning, type EffectiveRaciAssignment } from "@/lib/raci";
import { RaciCell } from "@/components/RaciCell";

type UserRef = { id: string; name: string | null; email: string };

function userLabel(u: UserRef) {
  return u.name || u.email;
}

export function RaciTable({
  objectives,
  members,
  isOwner,
}: {
  objectives: {
    id: string;
    code: string | null;
    title: string;
    effective: EffectiveRaciAssignment[];
  }[];
  members: UserRef[];
  isOwner: boolean;
}) {
  const cellClass = "border border-black/5 px-1 py-1 text-center dark:border-white/5";
  const headerCellClass =
    "sticky top-0 z-10 border border-black/5 bg-zinc-50 px-2 py-2 text-xs font-medium text-zinc-500 dark:border-white/5 dark:bg-zinc-900 dark:text-zinc-400";
  const labelColClass =
    "sticky left-0 z-20 min-w-[220px] max-w-[280px] border border-black/5 bg-white px-3 py-2 text-left align-top dark:border-white/5 dark:bg-zinc-950";

  return (
    <div className="overflow-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${headerCellClass} sticky left-0 z-30 text-left`}>
              Objective
            </th>
            {members.map((m) => (
              <th key={m.id} className={headerCellClass}>
                {userLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objectives.map((o) => {
            const warning = accountableWarning(o.effective);
            return (
              <tr key={o.id}>
                <td className={labelColClass}>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {o.code && (
                      <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        {o.code}
                      </span>
                    )}
                    {o.title}
                  </p>
                  {warning && (
                    <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                      ⚠ {warning}
                    </p>
                  )}
                </td>
                {members.map((m) => {
                  const existing = o.effective.find((a) => a.userId === m.id);
                  const letter = existing ? RACI_LETTER[existing.role] : "";
                  const title = existing
                    ? existing.implied
                      ? `${RACI_LABEL[existing.role]} (automatic — ${existing.impliedReason})`
                      : RACI_LABEL[existing.role]
                    : undefined;
                  return (
                    <td key={m.id} className={cellClass}>
                      {isOwner ? (
                        <RaciCell objectiveId={o.id} userId={m.id} value={letter} title={title} />
                      ) : letter ? (
                        <span
                          title={title}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${RACI_STYLES[letter]} ${
                            existing?.implied ? "border border-dashed border-black/20 dark:border-white/20" : ""
                          }`}
                        >
                          {letter}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
