import { readCollection } from "../services/api";

export const WARRANTY_STATUSES = {
  pending: "Chờ xử lý", approved: "Đã duyệt", rejected: "Đã từ chối",
  processing: "Đang bảo hành", completed: "Đã hoàn tất", cancelled: "Đã hủy",
};

export function normalizeWarranty(value = {}) {
  const product = value.product || value.order_item?.product || value.orderItem?.product || {};
  const order = value.order || value.order_item?.order || value.orderItem?.order || {};
  const customer = value.customer || value.user || order.customer || {};
  const policy = value.warranty_policy || value.warrantyPolicy || product.warranty_policy || {};
  return {
    id: value.id ?? value.warranty_request_id,
    code: value.request_code || value.code || value.warranty_code || value.id || "",
    orderId: value.order_id ?? order.id,
    orderCode: value.order_code || order.order_code || order.code || order.id || "",
    orderItemId: value.order_item_id ?? value.orderItemId,
    productName: value.product_name || product.name || value.order_item?.product_name || "Sản phẩm",
    productImage: value.product_image || product.thumbnail || product.image || "",
    customerName: value.customer_name || customer.full_name || customer.name || customer.email || "",
    reason: value.reason || value.warranty_reason || "",
    description: value.description || value.detail || "",
    status: String(value.status || "pending").toLowerCase(),
    statusLabel: value.status_label || WARRANTY_STATUSES[String(value.status || "pending").toLowerCase()],
    submittedAt: value.created_at || value.submitted_at || "",
    startDate: value.warranty_start_date || value.start_date || "",
    expiryDate: value.warranty_expiry_date || value.expiry_date || value.warranty_end_date || "",
    policyName: value.warranty_policy_name || policy.name || policy.title || "",
    policyDescription: policy.description || value.warranty_policy_description || "",
    processingNote: value.processing_note || value.admin_note || value.note || "",
    rejectionReason: value.rejection_reason || "",
    handledAt: value.approved_at || value.rejected_at || value.processed_at || "",
    handlerName: value.handler?.name || value.processed_by?.name || value.handler_name || "",
    timeline: readCollection(value.timeline || value.histories || {}, ["timeline", "histories"]),
    raw: value,
  };
}

export function normalizeWarrantyList(payload = {}, fallbackPage = 1, fallbackLimit = 10) {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const items = readCollection(source, ["warranty_requests", "requests"]).map(normalizeWarranty);
  const meta = payload.meta || payload.pagination || source?.meta || source?.pagination || {};
  const page = Number(meta.current_page ?? meta.page ?? payload.current_page ?? fallbackPage);
  const limit = Number(meta.per_page ?? meta.limit ?? payload.per_page ?? fallbackLimit);
  const total = Number(meta.total ?? payload.total ?? items.length);
  const lastPage = Number(meta.last_page ?? meta.total_pages ?? payload.last_page ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1))));
  return { items, pagination: { page, limit, total, lastPage } };
}

export function formatWarrantyDate(value, withTime = false) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
