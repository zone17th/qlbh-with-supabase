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
      <div className="rounded-lg border border-divider bg-white p-5 text-sm text-muted">
        Đang tải...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-divider bg-white p-5 text-sm text-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-divider bg-white shadow-soft-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-canvas border-b border-divider">
          <tr>
            {columns.map((column) => (
              <th
                className={column.className ?? "px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider text-xs"}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {rows.map((row, rowIndex) => (
            <tr className="hover:bg-canvas transition-colors" key={getRowKey?.(row, rowIndex) ?? rowIndex}>
              {columns.map((column) => (
                <td className={column.className ?? "px-6 py-4 text-ink/80"} key={column.key}>
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
