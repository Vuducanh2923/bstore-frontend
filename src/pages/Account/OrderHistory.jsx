import { useEffect, useState } from "react";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import StatusBadge from "../../components/StatusBadge";
import StatusMessage from "../../components/StatusMessage";
import { readCollection } from "../../services/api";
import { customerOrderService } from "../../services/bstoreService";
import { getStatusErrorMessage } from "../../utils/apiErrors";
import { formatCurrency } from "../../utils/formatters";
import OrderDetailModal from "./OrderDetailModal";

function displayText(value, fallback = "") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  return fallback;
}

function formatAddressValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return [
      value.address,
      value.street,
      value.ward,
      value.district,
      value.province,
      value.city,
    ].filter(Boolean).join(", ");
  }

  return "";
}

function readOrders(payload = {}) {
  const directOrders = readCollection(payload, ["orders"]);

  if (directOrders.length) {
    return directOrders;
  }

  const containers = [
    payload?.orders,
    payload?.order_history,
    payload?.customer_orders,
    payload?.data,
    payload?.data?.orders,
    payload?.data?.data,
  ];

  for (const container of containers) {
    const orders = readCollection(container, ["orders"]);

    if (orders.length) {
      return orders;
    }
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizeOrder(order = {}) {
  const shippingAddress =
    order.shipping_address ||
    order.shippingAddress ||
    order.delivery_address ||
    order.deliveryAddress ||
    order.address ||
    order.receiver_address ||
    order.receiverAddress ||
    order.user_address ||
    order.userAddress ||
    "";

  return {
    createdAt: order.created_at || order.createdAt || order.order_date || "",
    finalAmount: Number(order.final_amount || order.finalAmount || order.total || 0),
    id: order.id ?? order.order_id ?? order.orderId,
    orderCode: order.order_code || order.code || order.orderCode || order.id || "",
    paymentStatus: displayText(order.payment_status || order.paymentStatus),
    paymentStatusLabel: displayText(order.payment_status_label || order.paymentStatusLabel),
    raw: order,
    shippingAddress: formatAddressValue(shippingAddress),
    status: displayText(order.status),
    statusLabel: displayText(order.status_label || order.statusLabel),
  };
}

export default function OrderHistory() {
  const [detailState, setDetailState] = useState({
    errorMessage: "",
    loading: false,
    open: false,
    order: null,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let ignored = false;

    async function loadOrders() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await customerOrderService.getOrders();
        const nextOrders = readOrders(payload).map(normalizeOrder);

        if (!ignored) {
          setOrders(nextOrders);
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(
            getStatusErrorMessage(error, "Không thể tải lịch sử mua hàng."),
          );
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      ignored = true;
    };
  }, []);

  const handleOpenDetail = async (order) => {
    if (!order.id) {
      setDetailState({
        errorMessage: "Không tìm thấy mã đơn hàng để tải chi tiết.",
        loading: false,
        open: true,
        order: order.raw,
      });
      return;
    }

    setDetailState({
      errorMessage: "",
      loading: true,
      open: true,
      order: order.raw,
    });

    try {
      const payload = await customerOrderService.getOrder(order.id);
      setDetailState({
        errorMessage: "",
        loading: false,
        open: true,
        order: payload.order || payload.data || payload,
      });
    } catch (error) {
      setDetailState((current) => ({
        ...current,
        errorMessage: getStatusErrorMessage(
          error,
          "Không thể tải chi tiết đơn hàng.",
        ),
        loading: false,
      }));
    }
  };

  const handleCloseDetail = () => {
    setDetailState({
      errorMessage: "",
      loading: false,
      open: false,
      order: null,
    });
  };

  return (
    <section className="account-panel">
      <div className="account-panel-heading">
        <div>
          <h2>Lịch sử mua hàng</h2>
          <p>Theo dõi trạng thái xử lý, giao hàng và thanh toán.</p>
        </div>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      {loading ? <p className="muted-text">Đang tải lịch sử mua hàng...</p> : null}

      {!loading && orders.length === 0 ? (
        <div className="empty-state">
          <h2>Chưa có đơn hàng</h2>
          <p>Các đơn hàng đã đặt sẽ xuất hiện tại đây.</p>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="admin-table-wrap account-table-wrap">
          <table className="admin-table account-order-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái đơn hàng</th>
                <th>Trạng thái thanh toán</th>
                <th>Địa chỉ giao hàng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id || order.orderCode}>
                  <td className="admin-link">
                    #{displayText(order.orderCode, order.id)}
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{formatCurrency(order.finalAmount)}</td>
                  <td>
                    <StatusBadge label={order.statusLabel} value={order.status} />
                  </td>
                  <td>
                    <PaymentStatusBadge
                      label={order.paymentStatusLabel}
                      value={order.paymentStatus}
                    />
                  </td>
                  <td>{order.shippingAddress || "Chưa cập nhật"}</td>
                  <td>
                    <button onClick={() => handleOpenDetail(order)} type="button">
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {detailState.open ? (
        <OrderDetailModal
          errorMessage={detailState.errorMessage}
          loading={detailState.loading}
          onClose={handleCloseDetail}
          order={detailState.order}
        />
      ) : null}
    </section>
  );
}
