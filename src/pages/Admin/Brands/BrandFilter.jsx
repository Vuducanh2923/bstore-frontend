export default function BrandFilter({ onChange, value }) {
  return (
    <label className="brand-status-filter">
      <span>Trạng thái</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Tất cả</option>
        <option value="active">Đang hiển thị</option>
        <option value="inactive">Đã khóa</option>
      </select>
    </label>
  );
}
