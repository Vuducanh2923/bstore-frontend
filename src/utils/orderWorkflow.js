import { resolveMediaUrl } from "./formatters";
import { readOrder } from "./orders";

export const ORDER_STATUS_OPTIONS = [
  { label: "Chờ xử lý", value: "pending" },
  { label: "Đã xác nhận", value: "confirmed" },
  { label: "Đang xử lý", value: "processing" },
  { label: "Đang vận chuyển", value: "shipping" },
  { label: "Đã giao hàng", value: "delivered" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Chờ duyệt hủy", value: "pending_cancel" },
  { label: "Đã hủy", value: "cancelled" },
  { label: "Đang hoàn tiền", value: "refunding" },
  { label: "Đã hoàn tiền", value: "refunded" },
  { label: "Đã trả hàng", value: "returned" },
];

export const ORDER_TIMELINE_STEPS = [
  {
    aliases: ["created", "new", "pending"],
    dateFields: ["created_at", "createdAt", "order_date", "orderDate", "placed_at", "placedAt"],
    key: "created",
    label: "Đơn hàng đã tạo",
    note: "Đơn hàng được ghi nhận trên hệ thống.",
  },
  {
    aliases: ["assigned", "received", "accepted", "confirmed"],
    dateFields: ["assigned_at", "assignedAt", "received_at", "receivedAt", "accepted_at", "acceptedAt"],
    key: "assigned",
    label: "Staff đã nhận xử lý",
    note: "Nhân viên phụ trách đã tiếp nhận đơn hàng.",
  },
  {
    aliases: ["processing", "packing", "packaged"],
    dateFields: ["processing_at", "processingAt", "packed_at", "packedAt"],
    key: "processing",
    label: "Đang xử lý",
    note: "Đơn hàng đang được chuẩn bị.",
  },
  {
    aliases: ["shipping", "shipped", "delivering"],
    dateFields: ["shipping_at", "shippingAt", "shipped_at", "shippedAt", "delivery_started_at", "deliveryStartedAt"],
    key: "shipping",
    label: "Đang vận chuyển",
    note: "Đơn hàng đã bàn giao cho đơn vị vận chuyển.",
  },
  {
    aliases: ["delivered", "completed", "done"],
    dateFields: ["delivered_at", "deliveredAt", "completed_at", "completedAt"],
    key: "delivered",
    label: "Đã giao hàng",
    note: "Đơn hàng đã được giao thành công.",
  },
];

export const REFUND_TIMELINE_STEPS = [
  {
    aliases: ["requested", "request", "sent", "submitted", "pending"],
    dateFields: ["refund_requested_at", "refundRequestedAt", "requested_at", "requestedAt"],
    key: "requested",
    label: "Đã gửi yêu cầu",
  },
  {
    aliases: ["reviewing", "review", "considering", "processing"],
    dateFields: ["refund_reviewed_at", "refundReviewedAt", "reviewed_at", "reviewedAt"],
    key: "reviewing",
    label: "Đang xem xét",
  },
  {
    aliases: ["approved", "accepted"],
    dateFields: ["refund_approved_at", "refundApprovedAt", "approved_at", "approvedAt"],
    key: "approved",
    label: "Đã duyệt",
  },
  {
    aliases: ["refunding", "transferring", "paying"],
    dateFields: ["refunding_at", "refundingAt", "refund_processing_at", "refundProcessingAt"],
    key: "refunding",
    label: "Đang hoàn tiền",
  },
  {
    aliases: ["refunded", "completed", "done"],
    dateFields: ["refunded_at", "refundedAt", "refund_completed_at", "refundCompletedAt"],
    key: "refunded",
    label: "Hoàn tất",
  },
];

const DEFAULT_ADMIN_CONTACT = {
  avatar: "",
  email: "admin@bstore.local",
  hasStaff: true,
  id: "admin",
  name: "Admin BStore",
  phone: "1900 0000",
};

export function normalizeWorkflowKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function displayWorkflowText(value, fallback = "") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  if (typeof value === "object") {
    return (
      value.full_name ||
      value.fullName ||
      value.name ||
      value.label ||
      value.title ||
      value.phone ||
      value.email ||
      value.code ||
      fallback
    );
  }

  return fallback;
}

export function formatWorkflowDateTime(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function readField(source = {}, fields = []) {
  for (const field of fields) {
    const value = source?.[field];

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function readFirstObject(values = []) {
  return values.find(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  ) || {};
}

function readFirstArray(values = []) {
  return values.find(Array.isArray) || [];
}

function normalizeStaffSource(source = {}) {
  const staffObject = readFirstObject([
    source.staff,
    source.assigned_staff,
    source.assignedStaff,
    source.handler,
    source.handler_staff,
    source.handlerStaff,
    source.employee,
    source.employee_info,
    source.employeeInfo,
    source.user,
    source.admin,
    source.support_staff,
    source.supportStaff,
  ]);

  const merged = {
    ...staffObject,
    avatar:
      staffObject.avatar ||
      staffObject.avatar_url ||
      staffObject.avatarUrl ||
      source.staff_avatar ||
      source.staffAvatar ||
      source.assigned_staff_avatar ||
      source.assignedStaffAvatar ||
      source.handler_avatar ||
      source.handlerAvatar,
    email:
      staffObject.email ||
      source.staff_email ||
      source.staffEmail ||
      source.assigned_staff_email ||
      source.assignedStaffEmail ||
      source.handler_email ||
      source.handlerEmail,
    full_name:
      staffObject.full_name ||
      staffObject.fullName ||
      staffObject.name ||
      source.staff_name ||
      source.staffName ||
      source.assigned_staff_name ||
      source.assignedStaffName ||
      source.handler_name ||
      source.handlerName,
    id:
      staffObject.id ||
      staffObject.staff_id ||
      staffObject.staffId ||
      source.staff_id ||
      source.staffId ||
      source.assigned_staff_id ||
      source.assignedStaffId ||
      source.handler_id ||
      source.handlerId,
    phone:
      staffObject.phone ||
      staffObject.phone_number ||
      staffObject.phoneNumber ||
      source.staff_phone ||
      source.staffPhone ||
      source.assigned_staff_phone ||
      source.assignedStaffPhone ||
      source.handler_phone ||
      source.handlerPhone,
  };

  return merged;
}

export function getStaffInfo(payload = {}) {
  const order = readOrder(payload);
  const staff = normalizeStaffSource(order);
  const assignedAt = readField(order, [
    "assigned_at",
    "assignedAt",
    "received_at",
    "receivedAt",
    "accepted_at",
    "acceptedAt",
  ]);
  const avatarValue = displayWorkflowText(staff.avatar, "");
  const avatar = avatarValue ? resolveMediaUrl(avatarValue) : "";
  const name = displayWorkflowText(staff.full_name || staff.fullName || staff.name, "");
  const phone = displayWorkflowText(staff.phone || staff.phone_number || staff.phoneNumber, "");
  const email = displayWorkflowText(staff.email, "");
  const id = staff.id || staff.staff_id || staff.staffId || "";
  const hasStaff = Boolean(id || name || phone || email || avatar);

  return {
    assignedAt,
    avatar,
    email,
    hasStaff,
    id,
    name: name || (hasStaff ? "Nhân viên phụ trách" : ""),
    phone,
  };
}

export function getStaffInitials(staff = {}) {
  const name = displayWorkflowText(staff.name || staff.email || staff.phone, "NV");
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "NV";
}

function readStatusEntryStatus(entry = {}) {
  return normalizeWorkflowKey(
    entry.status ||
      entry.order_status ||
      entry.orderStatus ||
      entry.state ||
      entry.step ||
      entry.key ||
      entry.action,
  );
}

function findStepEntry(entries = [], step) {
  return entries.find((entry) => {
    const status = readStatusEntryStatus(entry);
    const actionText = normalizeWorkflowKey(
      `${entry.action || ""} ${entry.title || ""} ${entry.label || ""}`,
    );

    return step.aliases.some(
      (alias) => status === alias || actionText.includes(alias),
    );
  }) || {};
}

function readEntryTime(entry = {}) {
  return readField(entry, [
    "time",
    "timestamp",
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
    "changed_at",
    "changedAt",
    "happened_at",
    "happenedAt",
  ]);
}

function getCurrentOrderStepIndex(status) {
  const key = normalizeWorkflowKey(status);

  if (["delivered", "completed", "done"].includes(key)) {
    return 4;
  }

  if (["shipping", "shipped", "delivering"].includes(key)) {
    return 3;
  }

  if (["processing", "packing", "packaged"].includes(key)) {
    return 2;
  }

  if (["confirmed", "assigned", "received", "accepted"].includes(key)) {
    return 1;
  }

  return key ? 0 : -1;
}

export function getOrderStatusLabel(status, fallback = "") {
  const key = normalizeWorkflowKey(status);
  const option = ORDER_STATUS_OPTIONS.find((item) => item.value === key);

  return option?.label || fallback || displayWorkflowText(status, "Chưa cập nhật");
}

export function getTimelineEntries(payload = {}) {
  const order = readOrder(payload);

  return readFirstArray([
    order.timeline,
    order.timelines,
    order.status_timeline,
    order.statusTimeline,
    order.status_history,
    order.statusHistory,
    order.order_history,
    order.orderHistory,
    order.order_histories,
    order.orderHistories,
    order.history,
    order.histories,
    order.logs,
    order.events,
  ]);
}

export function buildOrderTimeline(payload = {}) {
  const order = readOrder(payload);
  const entries = getTimelineEntries(order);
  const staff = getStaffInfo(order);
  const currentIndex = getCurrentOrderStepIndex(
    order.status || order.order_status || order.orderStatus,
  );

  return ORDER_TIMELINE_STEPS.map((step, index) => {
    const entry = findStepEntry(entries, step);
    const entryStaff = getStaffInfo(entry);
    const time =
      readEntryTime(entry) ||
      readField(order, step.dateFields) ||
      (step.key === "assigned" ? staff.assignedAt : "");
    const hasEntry = Boolean(Object.keys(entry).length || time);
    const isDone = hasEntry || (currentIndex >= index && currentIndex >= 0);

    return {
      action: displayWorkflowText(entry.action || entry.title || entry.label, step.label),
      key: step.key,
      label: step.label,
      note: displayWorkflowText(entry.note || entry.notes || entry.description, step.note),
      staff: entryStaff.hasStaff ? entryStaff : staff,
      time,
      tone: isDone ? "done" : "pending",
    };
  });
}

function getCurrentRefundStepIndex(status) {
  const key = normalizeWorkflowKey(status);

  if (["refunded", "completed", "done"].includes(key)) {
    return 4;
  }

  if (["refunding", "transferring", "paying"].includes(key)) {
    return 3;
  }

  if (["approved", "accepted"].includes(key)) {
    return 2;
  }

  if (["reviewing", "review", "considering", "processing"].includes(key)) {
    return 1;
  }

  if (["requested", "request", "sent", "submitted", "pending"].includes(key)) {
    return 0;
  }

  return -1;
}

export function getRefundInfo(payload = {}) {
  const order = readOrder(payload);
  const refund = readFirstObject([
    order.refund,
    order.refund_request,
    order.refundRequest,
    order.refund_info,
    order.refundInfo,
  ]);
  const status = normalizeWorkflowKey(
    refund.status ||
      order.refund_status ||
      order.refundStatus ||
      (["refunding", "refunded"].includes(normalizeWorkflowKey(order.status))
        ? order.status
        : ""),
  );
  const rawTimeline = readFirstArray([
    refund.timeline,
    refund.history,
    order.refund_timeline,
    order.refundTimeline,
    order.refund_history,
    order.refundHistory,
  ]);
  const currentIndex = getCurrentRefundStepIndex(status);
  const timeline = REFUND_TIMELINE_STEPS.map((step, index) => {
    const entry = findStepEntry(rawTimeline, step);
    const time = readEntryTime(entry) || readField(refund, step.dateFields) || readField(order, step.dateFields);
    const hasEntry = Boolean(Object.keys(entry).length || time);
    const isDone = hasEntry || (currentIndex >= index && currentIndex >= 0);

    return {
      key: step.key,
      label: step.label,
      note: displayWorkflowText(entry.note || entry.description, ""),
      staff: getStaffInfo(entry),
      time,
      tone: isDone ? step.key : "pending",
    };
  });

  return {
    amount: refund.amount || order.refund_amount || order.refundAmount || "",
    reason: displayWorkflowText(
      refund.reason || order.refund_reason || order.refundReason,
      "Chưa có ghi chú hoàn tiền.",
    ),
    status,
    timeline,
  };
}

export function getComplaintContact(payload = {}) {
  const order = readOrder(payload);
  const staff = getStaffInfo(order);

  if (staff.hasStaff) {
    return {
      ...staff,
      source: "staff",
    };
  }

  const admin = normalizeStaffSource({
    admin:
      order.admin ||
      order.admin_contact ||
      order.adminContact ||
      order.support ||
      order.support_contact ||
      order.supportContact ||
      DEFAULT_ADMIN_CONTACT,
  });
  const name = displayWorkflowText(admin.full_name || admin.name, DEFAULT_ADMIN_CONTACT.name);
  const phone = displayWorkflowText(admin.phone, DEFAULT_ADMIN_CONTACT.phone);
  const email = displayWorkflowText(admin.email, DEFAULT_ADMIN_CONTACT.email);
  const avatarValue = displayWorkflowText(admin.avatar, "");

  return {
    avatar: avatarValue ? resolveMediaUrl(avatarValue) : "",
    email,
    hasStaff: true,
    id: admin.id || DEFAULT_ADMIN_CONTACT.id,
    name,
    phone,
    source: "admin",
  };
}

export function getProcessingHistory(payload = {}) {
  const order = readOrder(payload);
  const entries = getTimelineEntries(order);

  if (entries.length) {
    return entries.map((entry, index) => {
      const staff = getStaffInfo(entry);

      return {
        action: displayWorkflowText(
          entry.action ||
            entry.title ||
            entry.label ||
            getOrderStatusLabel(entry.status || entry.order_status || entry.orderStatus),
          "Cập nhật đơn hàng",
        ),
        id: entry.id || `${readEntryTime(entry)}-${index}`,
        note: displayWorkflowText(entry.note || entry.notes || entry.description, ""),
        staff,
        time: readEntryTime(entry),
      };
    });
  }

  return buildOrderTimeline(order)
    .filter((step) => step.time || step.tone === "done")
    .map((step) => ({
      action: step.action,
      id: step.key,
      note: step.note,
      staff: step.staff,
      time: step.time,
    }));
}

export function canCancelOrder(status) {
  return ["pending", "processing"].includes(normalizeWorkflowKey(status));
}
