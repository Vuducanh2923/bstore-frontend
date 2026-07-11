const STATUS_MAP = {
  active: { label: "Hoạt động", tone: "success" },
  inactive: { label: "Ngừng hoạt động", tone: "neutral" },
  blocked: { label: "Đã khóa", tone: "danger" },
  locked: { label: "Đã khóa", tone: "danger" },
  suspended: { label: "Tạm khóa", tone: "warning" },
  pending: { label: "Đang chờ xử lý", tone: "neutral" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  processing: { label: "Đang xử lý", tone: "info" },
  packing: { label: "Đang xử lý", tone: "info" },
  packaged: { label: "Đang xử lý", tone: "info" },
  shipping: { label: "Đang vận chuyển", tone: "warning" },
  shipped: { label: "Đang vận chuyển", tone: "warning" },
  delivering: { label: "Đang vận chuyển", tone: "warning" },
  delivered: { label: "Đã giao hàng", tone: "success" },
  completed: { label: "Đã giao hàng", tone: "success" },
  pending_cancel: { label: "Chờ duyệt hủy", tone: "warning" },
  delivery_failed: { label: "Giao hàng thất bại", tone: "danger" },
  failed: { label: "Giao hàng thất bại", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  canceled: { label: "Đã hủy", tone: "danger" },
  returned: { label: "Đã trả hàng", tone: "warning" },
  refunding: { label: "Đang hoàn tiền", tone: "purple" },
  refunded: { label: "Đã hoàn tiền", tone: "teal" },
};

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function StatusBadge({ label, value }) {
  const key = normalizeStatus(value || label);
  const status = STATUS_MAP[key] || {
    label: label || value || "Chưa cập nhật",
    tone: "neutral",
  };

  return (
    <span className={`status-badge status-badge--${status.tone}`}>
      {label || status.label}
    </span>
  );
}
