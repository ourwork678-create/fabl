import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  empty,
}: {
  columns: Column<T>[];
  data: T[];
  empty?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
        {empty ?? "কোনো তথ্য পাওয়া যায়নি"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn("whitespace-nowrap px-4 py-3 font-semibold text-gray-600", c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-gray-800", c.className)}>
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
