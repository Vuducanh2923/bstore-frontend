import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { customerOrderService, paymentService } from "../../services/bstoreService";
import orderApi from "../../services/orderApi";
import { previewDiscountCode } from "../../services/discountCodeApi";
import { formatCurrency, getPaymentRedirectUrl } from "../../utils/formatters";
import { getOrderCode, getOrderId, readOrder } from "../../utils/orders";
import {
  clearPendingVnpayPayment,
  readPendingVnpayPayment,
  savePendingVnpayPayment,
} from "../../utils/paymentSession";

const ORDER_SUCCESS_MESSAGE =
  "Đơn hàng đã được tạo thành công. Thông tin đơn hàng đã được gửi qua email.";
const VNPAY_REDIRECT_MESSAGE = "Đang chuyển bạn sang cổng thanh toán VNPAY.";
const VNPAY_PENDING_MESSAGE =
  "Đơn hàng đã được tạo nhưng chưa thanh toán. Vui lòng bấm Thanh toán lại.";
const VNPAY_NOT_RETRYABLE_MESSAGE =
  "Đơn hàng không còn ở trạng thái chờ thanh toán.";
const COD_PAYMENT_PENDING_MESSAGE =
  "Đơn hàng đã được tạo. Trạng thái thanh toán COD đang được cập nhật.";
const PAID_OR_CLOSED_PAYMENT_STATUSES = new Set([
  "paid",
  "success",
  "completed",
  "cancelled",
  "canceled",
  "refunded",
]);

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getOrderAmount(order = {}, fallbackAmount = 0) {
  const amount =
    order.total_amount ??
    order.totalAmount ??
    order.final_amount ??
    order.finalAmount ??
    fallbackAmount;

  return amount === null || amount === undefined || amount === ""
    ? null
    : Number(amount);
}

function getInitialPaymentMethod(searchParams) {
  return String(searchParams.get("payment") || "").toUpperCase() === "VNPAY"
    ? "VNPAY"
    : "COD";
}

function getInitialPendingVnpayOrder() {
  const pendingPayment = readPendingVnpayPayment();

  if (!pendingPayment?.orderId || !pendingPayment?.amount) {
    return null;
  }

  return {
    amount: Number(pendingPayment.amount),
    orderCode: pendingPayment.orderCode || "",
    orderId: pendingPayment.orderId,
  };
}

function buildPendingVnpayOrder(order, fallbackAmount) {
  const createdOrder = readOrder(order);
  const orderId = getOrderId(createdOrder) || getOrderId(order);
  const orderCode = getOrderCode(createdOrder) || getOrderCode(order);
  const amount = getOrderAmount(createdOrder, fallbackAmount);

  if (!orderId) {
    throw new Error("Không nhận được mã đơn hàng từ backend.");
  }

  if (amount === null || !Number.isFinite(amount)) {
    throw new Error("Không nhận được số tiền đơn hàng để thanh toán VNPAY.");
  }

  return {
    amount,
    orderCode,
    orderId,
  };
}

function buildVnpayPayload(pendingOrder) {
  return {
    order_id: pendingOrder.orderId,
    order_info: `Thanh toán đơn hàng #${pendingOrder.orderId}`,
  };
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

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, refreshCart, removeItem, totalAmount } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPendingVnpayOrder = getInitialPendingVnpayOrder();
  const [form, setForm] = useState({
    fullName: user?.full_name || user?.name || "",
    phone: user?.phone || "",
    address: "",
    note: "",
    discountCode: "",
    paymentMethod: initialPendingVnpayOrder
      ? "VNPAY"
      : getInitialPaymentMethod(searchParams),
  });
  const [loading, setLoading] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [message, setMessage] = useState("");
  const [pendingVnpayOrder, setPendingVnpayOrder] = useState(
    initialPendingVnpayOrder,
  );
  const checkoutInFlightRef = useRef(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleApplyDiscount = async () => {
    const code = form.discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountError("Vui lòng nhập mã giảm giá.");
      return;
    }

    setDiscountLoading(true);
    setDiscountError("");
    try {
      const result = await previewDiscountCode({
        discount_code: code,
        subtotal: totalAmount,
      });
      setAppliedDiscount({
        code: result.discount_code || code,
        discountAmount: Number(result.discount_amount || 0),
        finalAmount: Number(result.final_amount ?? totalAmount),
      });
      showToast("Áp dụng mã giảm giá thành công.", "success");
    } catch (error) {
      setAppliedDiscount(null);
      const apiMessage = getApiErrorMessage(error, "Mã giảm giá không hợp lệ.");
      setDiscountError(apiMessage);
      showToast(apiMessage, "error");
    } finally {
      setDiscountLoading(false);
    }
  };

  const redirectToVnpay = async (pendingOrder) => {
    const vnpayPayload = buildVnpayPayload(pendingOrder);
    const paymentPayload = await paymentService.createVnpayPayment(vnpayPayload);
    const paymentUrl = getPaymentRedirectUrl(paymentPayload);

    if (!paymentUrl) {
      throw new Error("Backend chưa trả về payment_url để chuyển sang VNPAY.");
    }

    savePendingVnpayPayment(pendingOrder);
    showToast(VNPAY_REDIRECT_MESSAGE, "info");
    setMessage(VNPAY_REDIRECT_MESSAGE);
    window.location.href = paymentUrl;
  };

  const getRetryablePendingVnpayOrder = async (pendingOrder) => {
    const payload = await customerOrderService.getOrder(pendingOrder.orderId);
    const order = readOrder(payload);

    if (!isRetryablePendingOrder(order)) {
      clearPendingVnpayPayment();
      setPendingVnpayOrder(null);
      throw new Error(VNPAY_NOT_RETRYABLE_MESSAGE);
    }

    return buildPendingVnpayOrder(order, pendingOrder.amount);
  };

  const handleRetryVnpayPayment = async () => {
    if (!pendingVnpayOrder || checkoutInFlightRef.current) {
      return;
    }

    checkoutInFlightRef.current = true;
    setLoading(true);
    setMessage("");

    try {
      const retryOrder = await getRetryablePendingVnpayOrder(pendingVnpayOrder);

      setPendingVnpayOrder(retryOrder);
      savePendingVnpayPayment(retryOrder);
      await redirectToVnpay(retryOrder);
    } catch (err) {
      const message =
        err?.message === VNPAY_NOT_RETRYABLE_MESSAGE
          ? VNPAY_NOT_RETRYABLE_MESSAGE
          : VNPAY_PENDING_MESSAGE;

      setMessage(message);
      showToast(message, "warning");
    } finally {
      checkoutInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (checkoutInFlightRef.current) {
      return;
    }

    if (form.paymentMethod === "VNPAY" && pendingVnpayOrder) {
      await handleRetryVnpayPayment();
      return;
    }

    const normalizedDiscountCode = form.discountCode.trim().toUpperCase();
    if (normalizedDiscountCode && appliedDiscount?.code !== normalizedDiscountCode) {
      setDiscountError("Vui lòng áp dụng mã giảm giá trước khi đặt hàng.");
      return;
    }

    checkoutInFlightRef.current = true;
    setLoading(true);
    setMessage("");

    try {
      const orderItems = items.map((item) => ({
        product_variant_id: item.variantId,
        quantity: item.quantity,
      }));
      const order = await orderApi.createOrder({
        receiver_name: form.fullName,
        receiver_phone: form.phone,
        receiver_email: user?.email || null,
        shipping_address: form.address,
        shipping_method: "standard",
        payment_method: form.paymentMethod,
        note: form.note,
        discounts: normalizedDiscountCode
          ? [{ discount_code: normalizedDiscountCode }]
          : [],
        items: orderItems,
      });

      const pendingOrder = buildPendingVnpayOrder(order, totalAmount);
      const orderId = pendingOrder.orderId;

      if (form.paymentMethod === "VNPAY") {
        setPendingVnpayOrder(pendingOrder);
        savePendingVnpayPayment(pendingOrder);

        try {
          await redirectToVnpay(pendingOrder);
        } catch {
          setMessage(VNPAY_PENDING_MESSAGE);
          showToast(VNPAY_PENDING_MESSAGE, "warning");
        }

        return;
      }

      try {
        await paymentService.createPayment({
          amount: pendingOrder.amount,
          order_id: orderId,
          payment_method: "COD",
          payment_provider: "cod",
          status: "pending",
        });
      } catch {
        await Promise.allSettled(items.map((item) => removeItem(item.id)));
        await refreshCart();

        showToast(COD_PAYMENT_PENDING_MESSAGE, "warning");
        setMessage(COD_PAYMENT_PENDING_MESSAGE);
        navigate(`/account/orders/${encodeURIComponent(orderId)}`);
        return;
      }

      await Promise.allSettled(items.map((item) => removeItem(item.id)));
      await refreshCart();

      showToast(ORDER_SUCCESS_MESSAGE, "success");
      setMessage(ORDER_SUCCESS_MESSAGE);
      navigate(`/account/orders/${encodeURIComponent(orderId)}`);
    } catch (err) {
      const fallbackMessage = err?.message || "Không tạo được đơn hàng.";
      const apiMessage = getApiErrorMessage(err, fallbackMessage);
      setMessage(apiMessage);
      showToast(apiMessage, "error");
    } finally {
      checkoutInFlightRef.current = false;
      setLoading(false);
    }
  };

  if (items.length === 0 && !pendingVnpayOrder) {
    return (
      <main className="container checkout-page">
        <section className="empty-state">
          <h1>Không có sản phẩm để thanh toán</h1>
          <Link className="primary-button" to="/products">
            Mua sắm ngay
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container checkout-page">
      <section className="page-heading">
        <span>Checkout</span>
        <h1>Thanh toán</h1>
      </section>
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      <div className="checkout-layout">
        <form className="checkout-form form-stack" onSubmit={handleSubmit}>
          {pendingVnpayOrder ? (
            <StatusMessage tone="warning">
              {VNPAY_PENDING_MESSAGE}
            </StatusMessage>
          ) : null}
          <label>
            Họ tên người nhận
            <input
              name="fullName"
              onChange={handleChange}
              required
              value={form.fullName}
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="phone"
              onChange={handleChange}
              required
              value={form.phone}
            />
          </label>
          <label>
            Địa chỉ giao hàng
            <textarea
              name="address"
              onChange={handleChange}
              required
              rows="4"
              value={form.address}
            />
          </label>
          <label>
            Ghi chú
            <textarea
              name="note"
              onChange={handleChange}
              rows="3"
              value={form.note}
            />
          </label>
          <div className="checkout-discount-field">
          <label>
            Mã giảm giá
            <input
              autoCapitalize="characters"
              disabled={Boolean(pendingVnpayOrder)}
              name="discountCode"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  discountCode: event.target.value.toUpperCase().replace(/\s/g, ""),
                }));
                setAppliedDiscount(null);
                setDiscountError("");
              }}
              placeholder="Nhập mã giảm giá"
              value={form.discountCode}
            />
            <small className="muted-text">
              Mã được Backend kiểm tra và tính trực tiếp vào báo giá.
            </small>
          </label>
          <button
            className="secondary-button"
            disabled={discountLoading || !form.discountCode.trim()}
            onClick={handleApplyDiscount}
            type="button"
          >
            {discountLoading ? "Đang kiểm tra..." : appliedDiscount ? "Áp dụng lại" : "Áp dụng"}
          </button>
          {discountError ? <small className="field-error">{discountError}</small> : null}
          </div>
          <div className="payment-options">
            <label className={form.paymentMethod === "COD" ? "selected" : ""}>
              <input
                checked={form.paymentMethod === "COD"}
                disabled={Boolean(pendingVnpayOrder)}
                name="paymentMethod"
                onChange={handleChange}
                type="radio"
                value="COD"
              />
              Thanh toán COD
            </label>
            <label className={form.paymentMethod === "VNPAY" ? "selected" : ""}>
              <input
                checked={form.paymentMethod === "VNPAY"}
                disabled={Boolean(pendingVnpayOrder)}
                name="paymentMethod"
                onChange={handleChange}
                type="radio"
                value="VNPAY"
              />
              VNPAY
            </label>
          </div>
          {pendingVnpayOrder && form.paymentMethod === "VNPAY" ? (
            <div className="payment-result-actions">
              <button
                className="primary-button"
                disabled={loading}
                onClick={handleRetryVnpayPayment}
                type="button"
              >
                {loading ? "Đang tạo thanh toán..." : "Thanh toán lại"}
              </button>
              <Link
                className="secondary-button"
                to={`/account/orders/${encodeURIComponent(pendingVnpayOrder.orderId)}`}
              >
                Xem đơn hàng
              </Link>
            </div>
          ) : null}
          <button
            className="primary-button"
            disabled={loading || Boolean(pendingVnpayOrder)}
            type="submit"
          >
            {loading
              ? form.paymentMethod === "VNPAY"
                ? "Đang tạo thanh toán..."
                : "Đang tạo đơn..."
              : "Đặt hàng"}
          </button>
        </form>
        <aside className="summary-panel">
          <h2>Đơn hàng</h2>
          {pendingVnpayOrder && items.length === 0 ? (
            <div>
              <span>
                Đơn hàng #{pendingVnpayOrder.orderCode || pendingVnpayOrder.orderId}
              </span>
              <strong>{formatCurrency(pendingVnpayOrder.amount)}</strong>
            </div>
          ) : null}
          {items.map((item) => (
            <div key={item.id}>
              <span>
                {item.productName || item.product.name} x {item.quantity}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}
          {!pendingVnpayOrder ? (
            <div className="summary-subtotal">
              <span>Tạm tính</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          ) : null}
          {appliedDiscount && !pendingVnpayOrder ? (
            <div className="summary-discount">
              <span>Giảm giá ({appliedDiscount.code})</span>
              <strong>-{formatCurrency(appliedDiscount.discountAmount)}</strong>
            </div>
          ) : null}
          <div className="summary-total">
            <span>Tổng cộng</span>
            <strong>
              {formatCurrency(
                pendingVnpayOrder?.amount ||
                  appliedDiscount?.finalAmount ||
                  totalAmount,
              )}
            </strong>
          </div>
        </aside>
      </div>
    </main>
  );
}
