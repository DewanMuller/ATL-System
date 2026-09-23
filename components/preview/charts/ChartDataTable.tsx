// Shared "View as table" accessibility fallback for every chart in this
// directory — a chart with no data-table alternative fails the CVD/print/
// forced-colors case (see the dataviz skill's accessibility pass).
export function ChartDataTable({
  items,
  centered = false,
}: {
  items: { label: string; value: number | string }[];
  centered?: boolean;
}) {
  return (
    <details className={centered ? "mt-2 text-center" : "mt-1"}>
      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
        View as table
      </summary>
      <table className={centered ? "mx-auto mt-2 text-left text-xs" : "mt-2 w-full text-left text-xs"}>
        <tbody>
          {items.map((item) => (
            <tr key={item.label} className="border-t border-black/5 dark:border-white/5">
              <td className="py-1 pr-4 text-zinc-700 dark:text-zinc-300">{item.label}</td>
              <td className="py-1 text-zinc-700 dark:text-zinc-300">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
