const PAYMENT_STATUS_MAP = {
  pending: { label: "Đang chờ thanh toán", tone: "warning" },
  unpaid: { label: "Chưa thanh toán", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  success: { label: "Đã thanh toán", tone: "success" },
  completed: { label: "Đã thanh toán", tone: "success" },
  failed: { label: "Thanh toán thất bại", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  canceled: { label: "Đã hủy", tone: "danger" },
  refunding: { label: "Đang hoàn tiền", tone: "purple" },
  refunded: { label: "Đã hoàn tiền", tone: "teal" },
  cod: { label: "Thanh toán khi nhận hàng", tone: "neutral" },
};

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function PaymentStatusBadge({ label, value }) {
  const key = normalizeStatus(value || label);
  const knownStatus = PAYMENT_STATUS_MAP[key];
  const status = knownStatus || {
    label: label || value || "Chưa cập nhật",
    tone: "neutral",
  };

  return (
    <span className={`status-badge status-badge--${status.tone}`}>
      {knownStatus ? status.label : label || status.label}
    </span>
  );
}
