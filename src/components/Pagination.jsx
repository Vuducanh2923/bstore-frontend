export default function Pagination({ disabled, onChange, page, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="admin-pagination warranty-pagination" aria-label="Phân trang">
      <button disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} type="button">Trước</button>
      <span>Trang {page} / {totalPages}</span>
      <button disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} type="button">Sau</button>
    </nav>
  );
}
