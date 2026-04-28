interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "Không có dữ liệu",
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
      <strong className="block text-slate-800">{title}</strong>
      {description && <p className="mt-1">{description}</p>}
    </div>
  );
}
