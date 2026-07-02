const STATUS_MAP = {
  active: { label: "Hoạt động", tone: "success" },
  inactive: { label: "Ngừng hoạt động", tone: "neutral" },
  blocked: { label: "Đã khóa", tone: "danger" },
  locked: { label: "Đã khóa", tone: "danger" },
  suspended: { label: "Tạm khóa", tone: "warning" },
  pending: { label: "Đang chờ xử lý", tone: "warning" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  processing: { label: "Đang đóng gói", tone: "info" },
  packing: { label: "Đang đóng gói", tone: "info" },
  packaged: { label: "Đang đóng gói", tone: "info" },
  shipping: { label: "Đang giao hàng", tone: "info" },
  shipped: { label: "Đang giao hàng", tone: "info" },
  delivering: { label: "Đang giao hàng", tone: "info" },
  delivered: { label: "Đã giao hàng", tone: "success" },
  completed: { label: "Đã giao hàng", tone: "success" },
  delivery_failed: { label: "Giao hàng thất bại", tone: "danger" },
  failed: { label: "Giao hàng thất bại", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  canceled: { label: "Đã hủy", tone: "danger" },
  returned: { label: "Đã trả hàng", tone: "warning" },
  refunded: { label: "Đã trả hàng", tone: "warning" },
};

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function StatusBadge({ label, value }) {
  const key = normalizeStatus(value || label);
  const status = STATUS_MAP[key] || { label: label || value || "Chưa cập nhật", tone: "neutral" };

  return (
    <span className={`status-badge status-badge--${status.tone}`}>
      {label || status.label}
    </span>
  );
}
