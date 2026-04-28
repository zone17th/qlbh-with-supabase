import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  getRowKey?: (row: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyText = "Không có dữ liệu",
  getRowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
        Đang tải...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-soft-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                className={column.className ?? "px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs"}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, rowIndex) => (
            <tr className="hover:bg-gray-50 transition-colors" key={getRowKey?.(row, rowIndex) ?? rowIndex}>
              {columns.map((column) => (
                <td className={column.className ?? "px-6 py-4 text-gray-700"} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
