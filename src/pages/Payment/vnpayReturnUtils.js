export function isSettledVnpayResponse(payload = {}) {
  const data = payload?.data || {};

  return payload.success === true && (
    data.successful === true ||
    data.payment_status === "paid" ||
    data.payment?.status === "paid"
  );
}
