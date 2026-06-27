export default function BrandSearch({ onChange, value }) {
  return (
    <label className="admin-tab-search brand-search">
      <span>Search</span>
      <input
        aria-label="Search brands"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm nhãn hàng..."
        type="search"
        value={value}
      />
    </label>
  );
}
