import { BrandLogo } from "../../../components/BrandCard";

function formatBrandDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function StatusPill({ active }) {
  return (
    <span className={`admin-pill admin-pill--${active ? "success" : "danger"}`}>
      {active ? "Đang hiển thị" : "Đã khóa"}
    </span>
  );
}

export default function BrandTable({
  brands,
  loading,
  onDelete,
  onEdit,
  onToggleStatus,
}) {
  return (
    <div className="admin-table-wrap brand-table-wrap">
      <table className="admin-table brand-table">
        <thead>
          <tr>
            <th>Logo</th>
            <th>Tên nhãn hàng</th>
            <th>Slug</th>
            <th>Mô tả</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => (
            <tr key={brand.id || brand.slug || brand.name}>
              <td>
                <BrandLogo brand={brand} />
              </td>
              <td>
                <strong>{brand.name}</strong>
              </td>
              <td>{brand.slug || "-"}</td>
              <td>{brand.description || "-"}</td>
              <td>
                <StatusPill active={brand.active} />
              </td>
              <td>{formatBrandDate(brand.createdAt)}</td>
              <td>
                <button onClick={() => onEdit(brand)} type="button">
                  Sửa
                </button>
                <button onClick={() => onToggleStatus(brand)} type="button">
                  {brand.active ? "Khóa" : "Mở khóa"}
                </button>
                <button onClick={() => onDelete(brand)} type="button">
                  Xóa
                </button>
              </td>
            </tr>
          ))}
          {!loading && brands.length === 0 ? (
            <tr>
              <td colSpan="7">Chưa có nhãn hàng phù hợp.</td>
            </tr>
          ) : null}
          {loading ? (
            <tr>
              <td colSpan="7">Đang tải nhãn hàng...</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
