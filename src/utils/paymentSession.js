export const VNPAY_PENDING_PAYMENT_KEY = "bstore_vnpay_pending_payment";
export const VNPAY_RETURN_PATH = "/payment/vnpay-return";

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
