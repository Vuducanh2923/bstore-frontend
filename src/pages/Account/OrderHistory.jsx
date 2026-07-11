import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import StatusBadge from "../../components/StatusBadge";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import { readCollection } from "../../services/api";
import { customerOrderService } from "../../services/bstoreService";
import { getStatusErrorMessage } from "../../utils/apiErrors";
import { formatCurrency } from "../../utils/formatters";
import { displayWorkflowText } from "../../utils/orderWorkflow";
import OrderDetailModal from "./OrderDetailModal";

const EMPTY_ORDERS = [];

function displayText(value, fallback = "") {
  return displayWorkflowText(value, fallback);
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

function TableSkeleton() {
  return (
    <table className="admin-table account-order-table">
      <thead>
        <tr>
          {Array.from({ length: 7 }).map((_, index) => (
            <th key={`heading-${index}`}>
              <span className="skeleton-line order-skeleton-line" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {Array.from({ length: 7 }).map((_, cellIndex) => (
              <td key={`cell-${rowIndex}-${cellIndex}`}>
                <span className="skeleton-line order-skeleton-line" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OrderHistory() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [detailState, setDetailState] = useState({
    open: false,
    order: null,
    orderId: null,
  });

  const ordersQuery = useQuery({
    queryFn: async () => {
      const payload = await customerOrderService.getOrders();
      return readOrders(payload).map(normalizeOrder);
    },
    queryKey: ["customer", "orders"],
  });

  const detailQuery = useQuery({
    enabled: detailState.open && Boolean(detailState.orderId),
    queryFn: async () => {
      const payload = await customerOrderService.getOrder(detailState.orderId, {
        suppressGlobalError: true,
      });
      return payload.order || payload.data || payload;
    },
    queryKey: ["customer", "order", detailState.orderId],
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }) =>
      customerOrderService.cancelOrder(orderId, {
        cancel_reason: reason,
        reason,
      }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể hủy đơn hàng."), "error");
    },
    onSuccess: async (_, variables) => {
      showToast("Đã gửi yêu cầu hủy đơn hàng.", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "order", variables.orderId] }),
      ]);
    },
  });

  const orders = ordersQuery.data ?? EMPTY_ORDERS;
  const errorMessage = ordersQuery.error
    ? getStatusErrorMessage(ordersQuery.error, "Không thể tải lịch sử mua hàng.")
    : "";
  const detailOrder = detailQuery.data || detailState.order;
  const detailErrorMessage = detailQuery.error && !detailState.order
    ? getStatusErrorMessage(detailQuery.error, "Không thể tải chi tiết đơn hàng.")
    : "";
  const detailLoading = detailState.open && detailState.orderId
    ? detailQuery.isLoading || detailQuery.isFetching
    : false;

  const handleOpenDetail = (order) => {
    if (!order.id) {
      setDetailState({
        open: true,
        order: order.raw,
        orderId: null,
      });
      return;
    }

    setDetailState({
      open: true,
      order: order.raw,
      orderId: order.id,
    });
  };

  const handleCloseDetail = () => {
    setDetailState({
      open: false,
      order: null,
      orderId: null,
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

      {ordersQuery.isLoading ? (
        <div className="admin-table-wrap account-table-wrap">
          <TableSkeleton />
        </div>
      ) : null}

      {!ordersQuery.isLoading && orders.length === 0 ? (
        <div className="empty-state">
          <h2>Chưa có đơn hàng</h2>
          <p>Các đơn hàng đã đặt sẽ xuất hiện tại đây.</p>
        </div>
      ) : null}

      {!ordersQuery.isLoading && orders.length > 0 ? (
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
          {ordersQuery.isFetching ? (
            <p className="muted-text order-inline-refresh">
              Đang cập nhật dữ liệu...
            </p>
          ) : null}
        </div>
      ) : null}

      {detailState.open ? (
        <OrderDetailModal
          actionPending={cancelOrderMutation.isPending}
          errorMessage={detailErrorMessage}
          loading={detailLoading}
          onCancelOrder={(reason) =>
            cancelOrderMutation.mutateAsync({
              orderId: detailState.orderId,
              reason,
            })
          }
          onClose={handleCloseDetail}
          order={detailOrder}
        />
      ) : null}
    </section>
  );
}
