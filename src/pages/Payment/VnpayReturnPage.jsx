import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { customerOrderService, paymentService } from "../../services/bstoreService";
import { formatCurrency, getPaymentRedirectUrl } from "../../utils/formatters";
import { getOrderCode, getOrderId, readOrder } from "../../utils/orders";
import {
  clearPendingVnpayPayment,
  readPendingVnpayPayment,
  savePendingVnpayPayment,
} from "../../utils/paymentSession";

const SUCCESS_VALUES = new Set([
  "00",
  "success",
  "succeeded",
  "paid",
  "completed",
  "approved",
]);
const FAILED_VALUES = new Set([
  "failed",
  "fail",
  "failure",
  "cancelled",
  "canceled",
  "rejected",
  "expired",
  "unpaid",
]);
const PAID_OR_CLOSED_PAYMENT_STATUSES = new Set([
  "paid",
  "success",
  "completed",
  "cancelled",
  "canceled",
  "refunded",
]);
const VNPAY_NOT_RETRYABLE_MESSAGE =
  "Đơn hàng không còn ở trạng thái chờ thanh toán.";
const VNPAY_SIGNATURE_ERROR_MESSAGE = "Lỗi chữ ký thanh toán VNPAY.";

function paramsToObject(searchParams) {
  return Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeStatus(value) {
  return normalizeValue(value).replace(/[\s-]+/g, "_");
}

function readContainers(payload = {}) {
  return [
    payload,
    payload.data,
    payload.result,
    payload.payment,
    payload.order,
  ].filter((item) => item && typeof item === "object");
}

function firstValue(containers, keys) {
  for (const container of containers) {
    for (const key of keys) {
      const value = container[key];

      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
  }

  return "";
}

function getQueryAmount(params = {}) {
  const amount = Number(params.vnp_Amount || 0);

  return amount > 0 ? amount / 100 : 0;
}

function getResultAmount(payload, params, pendingPayment) {
  const containers = readContainers(payload);
  const amount = Number(
    firstValue(containers, ["amount", "total_amount", "final_amount"]) ||
      pendingPayment?.amount ||
      getQueryAmount(params) ||
      0,
  );

  return Number.isFinite(amount) ? amount : 0;
}

function getResultOrderId(payload, params, pendingPayment) {
  const containers = readContainers(payload);

  return (
    pendingPayment?.orderId ||
    firstValue(containers, ["order_id", "orderId", "id"]) ||
    getOrderId(payload) ||
    params.order_id ||
    params.orderId ||
    params.vnp_TxnRef ||
    ""
  );
}

function getVerificationCode(payload, params) {
  const containers = readContainers(payload);

  return normalizeValue(
    firstValue(containers, [
      "code",
      "response_code",
      "responseCode",
      "vnp_ResponseCode",
      "vnpResponseCode",
    ]) || params.vnp_ResponseCode,
  );
}

function getOrderAmount(order = {}, fallbackAmount = 0) {
  const normalizedOrder = readOrder(order);
  const amount =
    normalizedOrder.total_amount ??
    normalizedOrder.totalAmount ??
    normalizedOrder.final_amount ??
    normalizedOrder.finalAmount ??
    fallbackAmount;

  return amount === null || amount === undefined || amount === ""
    ? null
    : Number(amount);
}

function isRetryablePendingOrder(order = {}) {
  const normalizedOrder = readOrder(order);
  const orderStatus = normalizeStatus(
    normalizedOrder.status ||
      normalizedOrder.order_status ||
      normalizedOrder.orderStatus,
  );
  const paymentStatus = normalizeStatus(
    normalizedOrder.payment_status ||
      normalizedOrder.paymentStatus ||
      normalizedOrder.payment?.status,
  );

  if (orderStatus && orderStatus !== "pending") {
    return false;
  }

  return !PAID_OR_CLOSED_PAYMENT_STATUSES.has(paymentStatus);
}

function normalizeVerificationResult(payload, params, pendingPayment) {
  const containers = readContainers(payload);
  const verificationCode = getVerificationCode(payload, params);
  const backendStatusValues = [
    firstValue(containers, [
      "status",
      "payment_status",
      "paymentStatus",
      "transaction_status",
      "transactionStatus",
      "result",
    ]),
  ].map(normalizeValue);
  const verifiedSuccess = containers.some(
    (container) =>
      container.verified === true ||
      container.is_verified === true ||
      container.isVerified === true,
  );
  const backendSuccess = containers.some(
    (container) =>
      container.success === true ||
      container.is_success === true ||
      container.isSuccess === true ||
      container.paid === true,
  );
  const backendFailed = containers.some(
    (container) =>
      container.success === false ||
      container.is_success === false ||
      container.isSuccess === false ||
      container.verified === false ||
      container.is_verified === false ||
      container.isVerified === false,
  );
  const successfulStatus = backendStatusValues.some((value) =>
    SUCCESS_VALUES.has(value),
  );
  const failedStatus = backendStatusValues.some(
    (value) => value && value !== "00" && FAILED_VALUES.has(value),
  );
  const success =
    !backendFailed &&
    (backendSuccess ||
      successfulStatus ||
      (verificationCode === "00" && verifiedSuccess && !failedStatus));
  const orderId = getResultOrderId(payload, params, pendingPayment);
  const signatureError = verificationCode === "97";
  const message =
    (signatureError ? VNPAY_SIGNATURE_ERROR_MESSAGE : "") ||
    firstValue(containers, ["message", "description", "status_message"]) ||
    (success
      ? "Giao dịch VNPAY đã được xác minh thành công."
      : "Giao dịch VNPAY không thành công hoặc chưa được xác minh.");

  return {
    amount: getResultAmount(payload, params, pendingPayment),
    message,
    orderCode:
      pendingPayment?.orderCode ||
      firstValue(containers, ["order_code", "orderCode", "code"]) ||
      "",
    orderId,
    status: !signatureError && success ? "success" : "failed",
  };
}

function getDetailTarget(orderId) {
  return orderId ? `/account/orders/${encodeURIComponent(orderId)}` : "/account#orders";
}

export default function VnpayReturnPage() {
  const queryString =
    typeof window === "undefined" ? "" : window.location.search;
  const queryParams = useMemo(
    () => paramsToObject(new URLSearchParams(queryString)),
    [queryString],
  );
  const [pendingPayment, setPendingPayment] = useState(readPendingVnpayPayment);
  const [result, setResult] = useState(() => ({
    amount: Number(pendingPayment?.amount || getQueryAmount(queryParams) || 0),
    message: "Đang xác minh kết quả thanh toán với backend.",
    orderCode: pendingPayment?.orderCode || "",
    orderId: pendingPayment?.orderId || "",
    status: "processing",
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const verifiedRef = useRef(null);
  const navigate = useNavigate();
  const { items, refreshCart, removeItem } = useCart();
  const latestItemsRef = useRef(items);
  const { showToast } = useToast();

  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  const clearCartItems = useCallback(async () => {
    const currentItems = await refreshCart();
    const targetItems = currentItems.length ? currentItems : latestItemsRef.current;

    await Promise.allSettled(targetItems.map((item) => removeItem(item.id)));
    await refreshCart();
  }, [refreshCart, removeItem]);

  useEffect(() => {
    if (verifiedRef.current === queryString) {
      return undefined;
    }

    let ignored = false;
    let navigateTimerId;

    async function verifyPayment() {
      setLoading(true);
      setError("");
      console.log("VNPAY query:", queryString);

      if (!queryString) {
        const message = "Không tìm thấy dữ liệu phản hồi từ VNPAY.";

        if (!ignored) {
          verifiedRef.current = queryString;
          setError(message);
          setResult((current) => ({
            ...current,
            message,
            status: "failed",
          }));
          showToast(message, "error");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await paymentService.verifyVnpayReturn(queryString);
        const payload = response?.data || {};
        const data = payload?.data || {};
        const isVnpaySuccess =
          payload.success === true ||
          data.verified === true ||
          data.successful === true ||
          data.payment_status === "paid" ||
          (queryParams.vnp_ResponseCode === "00" &&
            queryParams.vnp_TransactionStatus === "00");

        console.log("VNPAY raw response:", response);
        console.log("VNPAY payload:", payload);
        console.log("VNPAY data:", data);
        console.log("VNPAY success detected:", isVnpaySuccess);

        if (ignored) {
          return;
        }

        verifiedRef.current = queryString;

        if (isVnpaySuccess === true) {
          const nextResult = {
            status: "success",
            message: payload.message || "Thanh toán thành công",
            amount: Number(
              data.amount ||
                pendingPayment?.amount ||
                getQueryAmount(queryParams) ||
                0,
            ),
            orderId: data.order_id || pendingPayment?.orderId || "",
            orderCode:
              data.order_code ||
              pendingPayment?.orderCode ||
              queryParams.vnp_TxnRef ||
              "",
          };

          setResult(nextResult);
          setError("");
          setLoading(false);
          clearPendingVnpayPayment();
          setPendingPayment(null);
          refreshCart().catch((syncError) => {
            console.error("VNPAY cart refresh error:", syncError);
          });
          showToast("Thanh toán thành công", "success");

          if (nextResult.orderId) {
            navigateTimerId = window.setTimeout(() => {
              navigate(`/account/orders/${nextResult.orderId}`, { replace: true });
            }, 1400);
          }

          return;
        }

        const nextResult = normalizeVerificationResult(
          payload,
          queryParams,
          pendingPayment,
        );

        setError("");
        setResult(nextResult);

        if (nextResult.status === "success") {
          clearPendingVnpayPayment();
          setPendingPayment(null);
          setLoading(false);
          refreshCart().catch((syncError) => {
            console.error("VNPAY cart refresh error:", syncError);
          });
          showToast("Thanh toán thành công", "success");
          if (nextResult.orderId) {
            navigateTimerId = window.setTimeout(() => {
              navigate(getDetailTarget(nextResult.orderId), { replace: true });
            }, 1400);
          }
        } else {
          const message = nextResult.message || "Thanh toán thất bại";
          setError(message);
          showToast(message, "error");
        }
      } catch (error) {
        console.error("VNPAY verify error:", error);

        const status = Number(error?.response?.status || 0);
        const message =
          status === 405
            ? "Frontend đang gọi sai method, phải dùng GET"
            : getVerificationCode(error?.response?.data, queryParams) === "97"
              ? VNPAY_SIGNATURE_ERROR_MESSAGE
              : error?.response?.data?.message ||
                error?.message ||
                getApiErrorMessage(
                  error,
                  "Không thể xác minh kết quả thanh toán VNPAY.",
                );

        if (!ignored) {
          verifiedRef.current = queryString;
          setError(message);
          setResult((current) => ({
            ...current,
            message,
            status: "failed",
          }));
          showToast(message, "error");
        }
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();

    return () => {
      ignored = true;
      if (navigateTimerId) {
        window.clearTimeout(navigateTimerId);
      }
    };
  }, [
    navigate,
    pendingPayment,
    queryParams,
    queryString,
    refreshCart,
    showToast,
  ]);

  const handleRetryVnpay = async () => {
    const orderId = result.orderId || pendingPayment?.orderId;

    if (!orderId) {
      navigate("/checkout?payment=VNPAY");
      return;
    }

    setActionLoading("retry");

    try {
      const orderPayload = await customerOrderService.getOrder(orderId);
      const order = readOrder(orderPayload);

      if (!isRetryablePendingOrder(order)) {
        clearPendingVnpayPayment();
        setPendingPayment(null);
        throw new Error(VNPAY_NOT_RETRYABLE_MESSAGE);
      }

      const retryOrderId = getOrderId(order) || orderId;
      const amount = getOrderAmount(
        order,
        result.amount || pendingPayment?.amount || getQueryAmount(queryParams),
      );

      if (amount === null || !Number.isFinite(amount)) {
        throw new Error("Không nhận được số tiền đơn hàng để thanh toán VNPAY.");
      }

      const payload = await paymentService.createVnpayPayment({
        amount,
        order_id: retryOrderId,
        order_info: `Thanh toán đơn hàng #${retryOrderId}`,
      });
      const paymentUrl = getPaymentRedirectUrl(payload);

      if (!paymentUrl) {
        throw new Error("Backend chưa trả về payment_url để thanh toán lại.");
      }

      savePendingVnpayPayment({
        amount,
        orderCode: getOrderCode(order) || result.orderCode || pendingPayment?.orderCode || "",
        orderId: retryOrderId,
      });
      showToast("Đang chuyển bạn sang cổng thanh toán VNPAY.", "info");
      window.location.href = paymentUrl;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        error?.message || "Không thể tạo lại thanh toán VNPAY.",
      );
      showToast(message, "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleUseCod = async () => {
    const orderId = result.orderId || pendingPayment?.orderId;

    if (!orderId) {
      navigate("/checkout?payment=COD");
      return;
    }

    setActionLoading("cod");

    try {
      await paymentService.createPayment({
        amount: result.amount || pendingPayment?.amount || getQueryAmount(queryParams),
        order_id: orderId,
        payment_method: "COD",
        payment_provider: "cod",
        status: "pending",
      });
      clearPendingVnpayPayment();
      setPendingPayment(null);
      await clearCartItems();
      showToast("Đã chuyển đơn hàng sang thanh toán COD.", "success");
      navigate(getDetailTarget(orderId), { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Không thể chuyển đơn hàng sang COD.",
      );
      showToast(message, "error");
    } finally {
      setActionLoading("");
    }
  };

  const isProcessing = loading;
  const isSuccess = !loading && result.status === "success";
  const title = isProcessing
    ? "Đang xác minh thanh toán"
    : isSuccess
      ? "Thanh toán thành công"
      : "Thanh toán thất bại";

  return (
    <main className="container payment-return-page">
      <section className={`payment-result payment-result--${result.status}`}>
        <div className="payment-result-heading">
          <span>VNPAY Sandbox</span>
          <h1>{title}</h1>
          <p>{isProcessing ? "Vui lòng đợi trong giây lát." : result.message}</p>
        </div>

        <StatusMessage tone={isSuccess ? "success" : "error"}>
          {!isProcessing ? error || result.message : ""}
        </StatusMessage>

        <dl className="payment-meta">
          <div>
            <dt>Mã đơn hàng</dt>
            <dd>{result.orderCode || result.orderId || queryParams.vnp_TxnRef || "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Số tiền</dt>
            <dd>{result.amount ? formatCurrency(result.amount) : "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Mã phản hồi</dt>
            <dd>{queryParams.vnp_ResponseCode || "Chưa cập nhật"}</dd>
          </div>
        </dl>

        {!isProcessing ? (
          <div className="payment-result-actions">
            {isSuccess ? (
              <>
                {result.orderId ? (
                  <Link className="primary-button" to={getDetailTarget(result.orderId)}>
                    Xem chi tiết đơn hàng
                  </Link>
                ) : null}
                <Link className={result.orderId ? "secondary-button" : "primary-button"} to="/account#orders">
                  Lịch sử mua hàng
                </Link>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  disabled={Boolean(actionLoading)}
                  onClick={handleRetryVnpay}
                  type="button"
                >
                  {actionLoading === "retry" ? "Đang tạo lại..." : "Thử lại VNPAY"}
                </button>
                <button
                  className="secondary-button"
                  disabled={Boolean(actionLoading)}
                  onClick={handleUseCod}
                  type="button"
                >
                  {actionLoading === "cod" ? "Đang chuyển..." : "Chọn COD"}
                </button>
                <Link className="text-button" to="/checkout?payment=COD">
                  Quay lại checkout
                </Link>
              </>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
