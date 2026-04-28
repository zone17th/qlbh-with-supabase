import type { ReactNode } from "react";

interface Props {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export function DataState({ loading, error, empty, emptyText = "Không có dữ liệu", children }: Props) {
  if (loading) return <div className="state-box">Đang tải...</div>;
  if (error) return <div className="state-box error">{error}</div>;
  if (empty) return <div className="state-box">{emptyText}</div>;
  return <>{children}</>;
}
