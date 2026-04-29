interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <div className="pagination">
      <button disabled={page <= 0} onClick={() => onChange(page - 1)}>Trước</button>
      <span>Trang {page + 1} / {Math.max(totalPages, 1)}</span>
      <button disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sau</button>
    </div>
  );
}
