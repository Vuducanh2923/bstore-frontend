export const VNPAY_PENDING_PAYMENT_KEY = "bstore_vnpay_pending_payment";
export const VNPAY_RETURN_PATH = "/payment/vnpay-return";

const CLOSED_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "returned",
]);
const SETTLED_PAYMENT_STATUSES = new Set([
  "paid",
  "success",
  "completed",
  "refunded",
]);

function normalizePaymentValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function canRetryVnpayPayment(order = {}) {
  const paymentMethod = normalizePaymentValue(
    order.payment_method || order.paymentMethod || order.payment?.method,
  );
  const paymentStatus = normalizePaymentValue(
    order.payment_status || order.paymentStatus || order.payment?.status,
  );
  const orderStatus = normalizePaymentValue(
    order.status || order.order_status || order.orderStatus,
  );

  return (
    ["vnpay", "online"].includes(paymentMethod) &&
    !SETTLED_PAYMENT_STATUSES.has(paymentStatus) &&
    !CLOSED_ORDER_STATUSES.has(orderStatus)
  );
}

export function getVnpayReturnUrl() {
  if (typeof window === "undefined") {
    return VNPAY_RETURN_PATH;
  }

  return `${window.location.origin}${VNPAY_RETURN_PATH}`;
}

export function savePendingVnpayPayment(payment) {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(
    VNPAY_PENDING_PAYMENT_KEY,
    JSON.stringify({
      ...payment,
      createdAt: new Date().toISOString(),
    }),
  );
}

export function readPendingVnpayPayment() {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const rawPayment = sessionStorage.getItem(VNPAY_PENDING_PAYMENT_KEY);

  if (!rawPayment) {
    return null;
  }

  try {
    return JSON.parse(rawPayment);
  } catch {
    sessionStorage.removeItem(VNPAY_PENDING_PAYMENT_KEY);
    return null;
  }
}

export function clearPendingVnpayPayment() {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(VNPAY_PENDING_PAYMENT_KEY);
}
