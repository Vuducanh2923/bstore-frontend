import { readCollection } from "../services/api";

export const DISCOUNT_STATUSES = { active: "Đang áp dụng", inactive: "Ngừng áp dụng", expired: "Đã hết hạn" };
export const DISCOUNT_TYPES = { percentage: "Phần trăm", fixed_amount: "Số tiền cố định" };

export function normalizeDiscountCode(value = {}) {
  const status = String(value.status || (value.is_active === false ? "inactive" : "active")).toLowerCase();
  return {
    id: value.id ?? value.discount_code_id,
    code: value.code || value.discount_code || "",
    name: value.name || value.program_name || value.title || "",
    description: value.description || "",
    type: value.type || value.discount_type || "percentage",
    value: Number(value.value ?? value.discount_value ?? 0),
    maxDiscount: Number(value.max_discount_amount ?? value.max_discount ?? 0),
    minOrder: Number(value.min_order_amount ?? value.minimum_order_value ?? 0),
    usageCount: Number(value.usage_count ?? value.used_count ?? 0),
    usageLimit: Number(value.usage_limit ?? value.max_uses ?? 0),
    perCustomerLimit: Number(value.per_customer_limit ?? value.usage_limit_per_customer ?? 0),
    startAt: value.starts_at || value.start_at || value.start_date || "",
    endAt: value.ends_at || value.end_at || value.expires_at || value.end_date || "",
    status,
    creator: value.creator?.full_name || value.creator?.name || value.created_by?.name || value.creator_name || "",
    canDelete: value.can_delete ?? Number(value.used_count ?? 0) === 0,
    canOnlyDeactivate: value.can_only_deactivate ?? Number(value.used_count ?? 0) > 0,
    createdAt: value.created_at || "",
    raw: value,
  };
}

export function normalizeDiscountList(payload = {}, fallbackPage = 1, fallbackLimit = 10) {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const items = readCollection(source, ["discount_codes", "codes"]).map(normalizeDiscountCode);
  const meta = payload.meta || payload.pagination || source?.meta || source?.pagination || {};
  const page = Number(meta.current_page ?? meta.page ?? fallbackPage);
  const limit = Number(meta.per_page ?? meta.limit ?? fallbackLimit);
  const total = Number(meta.total ?? items.length);
  const lastPage = Number(meta.totalPages ?? meta.last_page ?? meta.total_pages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1))));
  return { items, pagination: { page, limit, total, lastPage } };
}
export function formatDiscountDate(value, time = false) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric",
    ...(time ? { hour:"2-digit", minute:"2-digit" } : {}) }).format(date);
}
