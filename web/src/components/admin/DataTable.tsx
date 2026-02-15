"use client";

export default function DataTable({
  headers,
  rows,
  emptyMessage = "No results.",
}: {
  headers: string[];
  rows: (string | JSX.Element)[][];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800" data-testid="data-table">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-900/70 text-neutral-300">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-3 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-neutral-950/40">
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-800">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-3 align-top text-neutral-200">
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="px-3 py-6 text-neutral-400" colSpan={headers.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
