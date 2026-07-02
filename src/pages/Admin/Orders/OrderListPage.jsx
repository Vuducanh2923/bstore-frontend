import { useCallback, useEffect, useMemo, useState } from "react";
import PaymentStatusBadge from "../../../components/PaymentStatusBadge";
import StatusBadge from "../../../components/StatusBadge";
import StatusMessage from "../../../components/StatusMessage";
import { useToast } from "../../../context/ToastContext";
import { readCollection } from "../../../services/api";
import { adminService } from "../../../services/bstoreService";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { formatCurrency } from "../../../utils/formatters";

const ORDER_STATUS_OPTIONS = [
  { label: "Chờ xử lý", value: "pending" },
  { label: "Đã xác nhận", value: "confirmed" },
  { label: "Đang xử lý", value: "processing" },
  { label: "Đang giao hàng", value: "shipping" },
  { label: "Đã giao hàng", value: "delivered" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Đã hủy", value: "cancelled" },
  { label: "Đã hoàn tiền", value: "refunded" },
  { label: "Đã trả hàng", value: "returned" },
];

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

  if (typeof value === "object") {
    return (
      value.name ||
      value.full_name ||
      value.fullName ||
      value.label ||
      value.title ||
      value.method ||
      value.code ||
      fallback
    );
  }

  return fallback;
}

function toNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const directNumber = Number(value);

    if (Number.isFinite(directNumber)) {
      return directNumber;
    }

    if (typeof value === "string") {
      const decimalText = value.replace(/[^\d.-]/g, "");
      const decimalNumber = Number(decimalText);

      if (Number.isFinite(decimalNumber)) {
        return decimalNumber;
      }

      const digitText = value.replace(/[^\d-]/g, "");
      const digitNumber = Number(digitText);

      if (Number.isFinite(digitNumber)) {
        return digitNumber;
      }
    }
  }

  return 0;
}

function formatDateTime(value) {
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
      value.address_line,
      value.addressLine,
      value.street,
      value.ward,
      value.district,
      value.province,
      value.city,
      value.country,
    ].filter(Boolean).join(", ");
  }

  return "";
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesSearch(query, ...values) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  );
}

function readOrders(payload = {}) {
  const directOrders = readCollection(payload, ["orders"]);

  if (directOrders.length) {
    return directOrders;
  }

  const containers = [
    payload?.data,
    payload?.data?.orders,
    payload?.data?.data,
    payload?.result,
    payload?.results,
    payload?.content,
  ];

  for (const container of containers) {
    const orders = readCollection(container, ["orders"]);

    if (orders.length) {
      return orders;
    }
  }

  return [];
}

function readOrderDetail(payload = {}) {
  return (
    payload?.order ||
    payload?.data?.order ||
    payload?.data?.data ||
    payload?.data ||
    payload
  );
}

function getCustomer(order = {}) {
  return (
    order.customer ||
    order.user ||
    order.account ||
    order.customer_info ||
    order.customerInfo ||
    order.user_info ||
    {}
  );
}

function getShippingAddress(order = {}) {
  return (
    order.shipping_address ||
    order.shippingAddress ||
    order.delivery_address ||
    order.deliveryAddress ||
    order.receiver_address ||
    order.receiverAddress ||
    order.address ||
    order.user_address ||
    order.userAddress ||
    ""
  );
}

function getCustomerInfo(order = {}) {
  const customer = getCustomer(order);
  const name = displayText(
    order.customer_name ||
      order.customerName ||
      order.receiver_name ||
      order.receiverName ||
      order.shipping_name ||
      order.shippingName ||
      customer.full_name ||
      customer.fullName ||
      customer.name,
    "Khách hàng",
  );
  const email = displayText(
    order.customer_email ||
      order.customerEmail ||
      order.receiver_email ||
      order.receiverEmail ||
      order.email ||
      customer.email,
    "",
  );
  const phone = displayText(
    order.customer_phone ||
      order.customerPhone ||
      order.receiver_phone ||
      order.receiverPhone ||
      order.shipping_phone ||
      order.shippingPhone ||
      order.phone ||
      customer.phone,
    "",
  );

  return {
    address: formatAddressValue(getShippingAddress(order)),
    email,
    name,
    phone,
  };
}

function getOrderCode(order = {}) {
  return displayText(
    order.order_code ||
      order.orderCode ||
      order.code ||
      order.order_number ||
      order.orderNumber ||
      order.id ||
      order.order_id ||
      order.orderId,
    "",
  );
}

function getOrderId(order = {}) {
  return (
    order.id ??
    order.order_id ??
    order.orderId ??
    order.uuid ??
    order._id ??
    getOrderCode(order)
  );
}

function getOrderItems(order = {}) {
  const directContainers = [
    order.order_items,
    order.orderItems,
    order.items,
    order.details,
    order.order_details,
    order.orderDetails,
    order.products,
  ];

  for (const container of directContainers) {
    if (Array.isArray(container)) {
      return container;
    }

    const items = readCollection(container, [
      "order_items",
      "orderItems",
      "items",
      "details",
      "products",
    ]);

    if (items.length) {
      return items;
    }
  }

  const nestedContainers = [
    order.data,
    order.data?.order_items,
    order.data?.orderItems,
    order.data?.items,
  ];

  for (const container of nestedContainers) {
    const items = readCollection(container, [
      "order_items",
      "orderItems",
      "items",
      "details",
      "products",
    ]);

    if (items.length) {
      return items;
    }
  }

  return [];
}

function normalizeOrderItem(item = {}) {
  const product = item.product || item.product_variant?.product || item.variant?.product || {};
  const variant = item.product_variant || item.productVariant || item.variant || {};
  const quantity = toNumber(item.quantity, item.qty, 0);
  const price = toNumber(
    item.price,
    item.unit_price,
    item.unitPrice,
    item.sale_price,
    item.salePrice,
    variant.price,
    product.price,
  );
  const subtotal = toNumber(
    item.subtotal,
    item.sub_total,
    item.total,
    item.amount,
    price * quantity,
  );
  const productName = displayText(
    item.product_name ||
      item.productName ||
      item.name ||
      product.name ||
      product.product_name ||
      product.productName ||
      variant.product_name ||
      variant.productName,
    "Sản phẩm",
  );
  const variantText = [
    displayText(item.color || variant.color, ""),
    displayText(item.ram || variant.ram, ""),
    displayText(item.storage || variant.storage, ""),
    displayText(item.sku || variant.sku, ""),
  ].filter(Boolean).join(" / ");

  return {
    id: item.id ?? item.order_item_id ?? item.orderItemId ?? `${productName}-${variantText}`,
    price,
    productName,
    quantity,
    subtotal,
    variantText,
  };
}

function normalizeOrderTotals(order = {}, items = []) {
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = toNumber(
    order.total_amount,
    order.totalAmount,
    order.subtotal,
    order.sub_total,
    order.items_total,
    order.itemsTotal,
    itemsTotal,
  );
  const discount = toNumber(
    order.discount_amount,
    order.discountAmount,
    order.discount,
    order.voucher_discount,
    order.voucherDiscount,
  );
  const shippingFee = toNumber(
    order.shipping_fee,
    order.shippingFee,
    order.ship_fee,
    order.shipFee,
    order.delivery_fee,
    order.deliveryFee,
  );
  const finalAmount = toNumber(
    order.final_amount,
    order.finalAmount,
    order.grand_total,
    order.grandTotal,
    order.payable_amount,
    order.payableAmount,
    order.amount,
    total - discount + shippingFee,
  );

  return {
    discount,
    finalAmount,
    shippingFee,
    total,
  };
}

function normalizeOrder(order = {}) {
  const customer = getCustomerInfo(order);
  const items = getOrderItems(order).map(normalizeOrderItem);
  const totals = normalizeOrderTotals(order, items);
  const status = displayText(order.status || order.order_status || order.orderStatus, "pending");
  const paymentStatus = displayText(
    order.payment_status ||
      order.paymentStatus ||
      order.payment?.status ||
      order.payment,
    "pending",
  );

  return {
    contact: customer.email || customer.phone || "Chưa cập nhật",
    createdAt:
      order.created_at ||
      order.createdAt ||
      order.order_date ||
      order.orderDate ||
      order.placed_at ||
      order.placedAt,
    customer,
    customerName: customer.name,
    id: getOrderId(order),
    items,
    orderCode: getOrderCode(order),
    paymentMethod: displayText(
      order.payment_method ||
        order.paymentMethod ||
        order.payment?.method ||
        order.payment?.name,
      "Chưa cập nhật",
    ),
    paymentStatus,
    paymentStatusLabel: displayText(
      order.payment_status_label || order.paymentStatusLabel,
      "",
    ),
    raw: order,
    shippingMethod: displayText(
      order.shipping_method ||
        order.shippingMethod ||
        order.delivery_method ||
        order.deliveryMethod,
      "Chưa cập nhật",
    ),
    status,
    statusLabel: displayText(order.status_label || order.statusLabel, ""),
    totals,
  };
}

function getStatusOptions(currentStatus, currentLabel = "") {
  const normalizedCurrentStatus = String(currentStatus || "").toLowerCase();
  const hasCurrentStatus = ORDER_STATUS_OPTIONS.some(
    (option) => option.value === normalizedCurrentStatus,
  );

  if (!normalizedCurrentStatus || hasCurrentStatus) {
    return ORDER_STATUS_OPTIONS;
  }

  return [
    {
      label: currentLabel || currentStatus,
      value: normalizedCurrentStatus,
    },
    ...ORDER_STATUS_OPTIONS,
  ];
}

function OrderStatusControl({
  currentLabel,
  disabled,
  onChange,
  status,
}) {
  const normalizedStatus = String(status || "").toLowerCase();

  return (
    <div className="order-status-control">
      <StatusBadge label={currentLabel} value={normalizedStatus} />
      <select
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={normalizedStatus}
      >
        {getStatusOptions(normalizedStatus, currentLabel).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function OrderDetailModal({
  errorMessage,
  loading,
  onClose,
  onStatusChange,
  order,
  updating,
}) {
  const normalizedOrder = useMemo(
    () => normalizeOrder(order || {}),
    [order],
  );
  const orderTitle = normalizedOrder.orderCode || normalizedOrder.id;
  const totals = normalizedOrder.totals;

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="order-detail-modal admin-order-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <span>Chi tiết đơn hàng</span>
            <h2>{orderTitle ? `#${orderTitle}` : "Đơn hàng"}</h2>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            x
          </button>
        </div>

        {loading ? <p className="muted-text">Đang tải chi tiết đơn hàng...</p> : null}
        <StatusMessage tone="error">{errorMessage}</StatusMessage>

        {!loading && order ? (
          <div className="order-detail-content admin-order-detail-content">
            <div className="admin-order-detail-grid">
              <article>
                <h3>Thông tin đơn hàng</h3>
                <dl>
                  <div>
                    <dt>Mã đơn</dt>
                    <dd>#{orderTitle || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Ngày đặt</dt>
                    <dd>{formatDateTime(normalizedOrder.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Thanh toán</dt>
                    <dd>{normalizedOrder.paymentMethod}</dd>
                  </div>
                  <div>
                    <dt>Vận chuyển</dt>
                    <dd>{normalizedOrder.shippingMethod}</dd>
                  </div>
                </dl>
                <div className="admin-order-status-stack">
                  <OrderStatusControl
                    currentLabel={normalizedOrder.statusLabel}
                    disabled={updating}
                    onChange={(nextStatus) =>
                      onStatusChange(normalizedOrder.id, nextStatus)
                    }
                    status={normalizedOrder.status}
                  />
                  <PaymentStatusBadge
                    label={normalizedOrder.paymentStatusLabel}
                    value={normalizedOrder.paymentStatus}
                  />
                </div>
              </article>

              <article>
                <h3>Thông tin khách hàng</h3>
                <dl>
                  <div>
                    <dt>Khách hàng</dt>
                    <dd>{normalizedOrder.customer.name || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{normalizedOrder.customer.email || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Số điện thoại</dt>
                    <dd>{normalizedOrder.customer.phone || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Địa chỉ</dt>
                    <dd>{normalizedOrder.customer.address || "Chưa cập nhật"}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <div className="admin-table-wrap order-detail-table-wrap">
              <table className="admin-table order-detail-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Phân loại</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedOrder.items.map((item, index) => (
                    <tr key={`${item.id}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{item.variantText || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                  {normalizedOrder.items.length === 0 ? (
                    <tr>
                      <td colSpan="5">Không có sản phẩm trong đơn hàng.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <dl className="order-total-list">
              <div>
                <dt>Tổng tiền</dt>
                <dd>{formatCurrency(totals.total)}</dd>
              </div>
              <div>
                <dt>Giảm giá</dt>
                <dd>{formatCurrency(totals.discount)}</dd>
              </div>
              <div>
                <dt>Phí ship</dt>
                <dd>{formatCurrency(totals.shippingFee)}</dd>
              </div>
              <div className="order-total-list-final">
                <dt>Thành tiền</dt>
                <dd>{formatCurrency(totals.finalAmount)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function OrderListPage() {
  const { showToast } = useToast();
  const [detailState, setDetailState] = useState({
    errorMessage: "",
    loading: false,
    open: false,
    order: null,
    orderId: null,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const payload = await adminService.getOrders();
      setOrders(readOrders(payload).map(normalizeOrder));
    } catch (error) {
      const message = getStatusErrorMessage(
        error,
        "Không thể tải danh sách đơn hàng.",
      );
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const refreshOrderDetail = useCallback(async (orderId) => {
    setDetailState((current) => ({
      ...current,
      errorMessage: "",
      loading: true,
    }));

    try {
      const payload = await adminService.getOrder(orderId);
      const detail = readOrderDetail(payload);

      setDetailState((current) => {
        if (String(current.orderId) !== String(orderId)) {
          return current;
        }

        return {
          ...current,
          errorMessage: "",
          loading: false,
          order: detail,
        };
      });

      return detail;
    } catch (error) {
      const message = getStatusErrorMessage(
        error,
        "Không thể tải chi tiết đơn hàng.",
      );

      setDetailState((current) => {
        if (String(current.orderId) !== String(orderId)) {
          return current;
        }

        return {
          ...current,
          errorMessage: message,
          loading: false,
        };
      });
      showToast(message, "error");
      return null;
    }
  }, [showToast]);

  useEffect(() => {
    const timerId = window.setTimeout(loadOrders, 0);
    return () => window.clearTimeout(timerId);
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesSearch(
          searchTerm,
          order.orderCode,
          order.id,
          order.customerName,
          order.contact,
          order.status,
          order.statusLabel,
          order.paymentStatus,
          order.paymentStatusLabel,
          order.totals.finalAmount,
        ),
      ),
    [orders, searchTerm],
  );

  const metrics = useMemo(() => {
    const paidOrders = orders.filter((order) =>
      ["paid", "success", "completed"].includes(
        String(order.paymentStatus || "").toLowerCase(),
      ),
    ).length;
    const pendingOrders = orders.filter((order) =>
      ["pending", "confirmed", "processing"].includes(
        String(order.status || "").toLowerCase(),
      ),
    ).length;
    const revenue = orders.reduce(
      (sum, order) => sum + order.totals.finalAmount,
      0,
    );

    return {
      paidOrders,
      pendingOrders,
      revenue,
      totalOrders: orders.length,
    };
  }, [orders]);

  const handleOpenDetail = (order) => {
    setDetailState({
      errorMessage: "",
      loading: Boolean(order.id),
      open: true,
      order: order.raw,
      orderId: order.id,
    });

    if (order.id) {
      refreshOrderDetail(order.id);
    }
  };

  const handleCloseDetail = () => {
    setDetailState({
      errorMessage: "",
      loading: false,
      open: false,
      order: null,
      orderId: null,
    });
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    if (!orderId || !status) {
      return;
    }

    const currentOrder = orders.find(
      (order) => String(order.id) === String(orderId),
    );

    if (currentOrder && String(currentOrder.status).toLowerCase() === status) {
      return;
    }

    setUpdatingOrderId(orderId);

    try {
      await adminService.updateOrderStatus(orderId, { status });
      showToast("Đã cập nhật trạng thái đơn hàng.", "success");
      await loadOrders();

      if (
        detailState.open &&
        String(detailState.orderId) === String(orderId)
      ) {
        await refreshOrderDetail(orderId);
      }
    } catch (error) {
      const message = getStatusErrorMessage(
        error,
        "Không thể cập nhật trạng thái đơn hàng.",
      );
      showToast(message, "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <section className="admin-dashboard admin-management-page admin-orders-page">
      <div className="admin-page-heading">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>Theo dõi đơn hàng, thanh toán và cập nhật trạng thái xử lý.</p>
        </div>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      <div className="order-metric-row admin-orders-metrics">
        <article>
          <span className="metric-icon metric-icon--blue">O</span>
          <div>
            <small>Tổng đơn</small>
            <strong>{metrics.totalOrders}</strong>
          </div>
        </article>
        <article>
          <span className="metric-icon metric-icon--orange">P</span>
          <div>
            <small>Đang xử lý</small>
            <strong>{metrics.pendingOrders}</strong>
          </div>
        </article>
        <article>
          <span className="metric-icon metric-icon--green">V</span>
          <div>
            <small>Đã thanh toán</small>
            <strong>{metrics.paidOrders}</strong>
          </div>
        </article>
        <article>
          <span className="metric-icon metric-icon--purple">₫</span>
          <div>
            <small>Doanh thu</small>
            <strong>{formatCurrency(metrics.revenue)}</strong>
          </div>
        </article>
      </div>

      <div className="admin-table-wrap admin-orders-table-card">
        <div className="admin-orders-toolbar">
          <label className="admin-tab-search">
            <span>Tìm kiếm</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Mã đơn, khách hàng, email, SĐT..."
              type="search"
              value={searchTerm}
            />
          </label>
          <button disabled={loading} onClick={loadOrders} type="button">
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        {loading ? <p className="muted-text">Đang tải danh sách đơn hàng...</p> : null}

        {!loading && filteredOrders.length === 0 ? (
          <div className="admin-empty-state">
            <h2>Chưa có đơn hàng</h2>
            <p>Dữ liệu đơn hàng từ backend sẽ hiển thị tại đây.</p>
          </div>
        ) : null}

        {!loading && filteredOrders.length > 0 ? (
          <table className="admin-table admin-order-table admin-orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Email/SĐT</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái đơn hàng</th>
                <th>Trạng thái thanh toán</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id || order.orderCode}>
                  <td className="admin-link">#{order.orderCode || order.id}</td>
                  <td>
                    <strong>{order.customerName}</strong>
                  </td>
                  <td>{order.contact}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{formatCurrency(order.totals.finalAmount)}</td>
                  <td>
                    <OrderStatusControl
                      currentLabel={order.statusLabel}
                      disabled={updatingOrderId === order.id}
                      onChange={(status) =>
                        handleUpdateOrderStatus(order.id, status)
                      }
                      status={order.status}
                    />
                  </td>
                  <td>
                    <PaymentStatusBadge
                      label={order.paymentStatusLabel}
                      value={order.paymentStatus}
                    />
                  </td>
                  <td>
                    <button onClick={() => handleOpenDetail(order)} type="button">
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {detailState.open ? (
        <OrderDetailModal
          errorMessage={detailState.errorMessage}
          loading={detailState.loading}
          onClose={handleCloseDetail}
          onStatusChange={handleUpdateOrderStatus}
          order={detailState.order}
          updating={updatingOrderId === detailState.orderId}
        />
      ) : null}
    </section>
  );
}
