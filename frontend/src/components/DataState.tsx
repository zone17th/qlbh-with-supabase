import type { ReactNode } from "react";

interface Props {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export function DataState({ loading, error, empty, emptyText = "Không có dữ liệu", children }: Props) {
  if (error) return <div className="state-box error">{error}</div>;

  return (
    <div className="relative min-h-[100px] w-full h-full">
      <div
        className={`transition-all duration-300 h-full ${
          loading ? "opacity-40 blur-[1px] pointer-events-none select-none" : "opacity-100 blur-0"
        }`}
      >
        {empty && !loading ? <div className="state-box">{emptyText}</div> : children}
      </div>
    </div>
  );
}
