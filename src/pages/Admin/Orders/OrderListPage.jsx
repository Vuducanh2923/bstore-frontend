import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PaymentStatusBadge from "../../../components/PaymentStatusBadge";
import StatusBadge from "../../../components/StatusBadge";
import StatusMessage from "../../../components/StatusMessage";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { readCollection } from "../../../services/api";
import { adminService } from "../../../services/bstoreService";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { formatCurrency } from "../../../utils/formatters";
import {
  buildOrderTimeline,
  canCancelOrder,
  displayWorkflowText,
  formatWorkflowDateTime,
  getComplaintContact,
  getOrderStatusLabel,
  getProcessingHistory,
  getRefundInfo,
  getStaffInfo,
  getStaffInitials,
  normalizeWorkflowKey,
  ORDER_STATUS_OPTIONS,
} from "../../../utils/orderWorkflow";

const EMPTY_ORDERS = [];

function displayText(value, fallback = "") {
  return displayWorkflowText(value, fallback);
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
    }
  }

  return 0;
}

function formatDateTime(value) {
  return formatWorkflowDateTime(value);
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

  return {
    address: formatAddressValue(getShippingAddress(order)),
    email: displayText(
      order.customer_email ||
        order.customerEmail ||
        order.receiver_email ||
        order.receiverEmail ||
        order.email ||
        customer.email,
      "",
    ),
    name: displayText(
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
    ),
    phone: displayText(
      order.customer_phone ||
        order.customerPhone ||
        order.receiver_phone ||
        order.receiverPhone ||
        order.shipping_phone ||
        order.shippingPhone ||
        order.phone ||
        customer.phone,
      "",
    ),
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
  const statusLabel = displayText(
    order.status_label || order.statusLabel,
    getOrderStatusLabel(status),
  );
  const paymentStatus = displayText(
    order.payment_status ||
      order.paymentStatus ||
      order.payment?.status ||
      order.payment,
    "pending",
  );
  const staff = getStaffInfo(order);

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
    staff,
    status,
    statusLabel,
    totals,
  };
}

function getStatusOptions(currentStatus, currentLabel = "") {
  const normalizedCurrentStatus = normalizeWorkflowKey(currentStatus);
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
  const normalizedStatus = normalizeWorkflowKey(status);

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

function StaffSummary({ action, staff }) {
  if (!staff?.hasStaff) {
    return (
      <div className="order-staff-summary order-staff-summary--empty">
        <strong>Chưa có người xử lý</strong>
        {action}
      </div>
    );
  }

  return (
    <div className="order-staff-summary">
      <span className="order-staff-avatar">
        {staff.avatar ? (
          <img alt={staff.name || "Staff"} src={staff.avatar} />
        ) : (
          getStaffInitials(staff)
        )}
      </span>
      <div>
        <strong>{staff.name || "Nhân viên phụ trách"}</strong>
        <span>{staff.phone || "Chưa cập nhật SĐT"}</span>
      </div>
      {action}
    </div>
  );
}

function WorkflowTimeline({ items, variant = "order" }) {
  return (
    <ol className={`workflow-timeline workflow-timeline--${variant}`}>
      {items.map((item, index) => (
        <li
          className={`workflow-timeline-item workflow-timeline-item--${item.tone || "pending"}`}
          key={`${item.key || item.label}-${index}`}
        >
          <div className="workflow-timeline-node" aria-hidden="true">
            <span>●</span>
            {index < items.length - 1 ? <i>↓</i> : null}
          </div>
          <div className="workflow-timeline-body">
            <strong>{item.label || item.action}</strong>
            <dl>
              <div>
                <dt>Thời gian</dt>
                <dd>{formatDateTime(item.time)}</dd>
              </div>
              <div>
                <dt>Nhân viên</dt>
                <dd>{item.staff?.hasStaff ? item.staff.name : "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Ghi chú</dt>
                <dd>{item.note || "Chưa có ghi chú"}</dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProcessingHistoryTimeline({ items }) {
  if (!items.length) {
    return <p className="muted-text">Chưa có lịch sử xử lý.</p>;
  }

  return (
    <ol className="processing-history-timeline">
      {items.map((item, index) => (
        <li key={item.id || `${item.action}-${index}`}>
          <time>{formatDateTime(item.time)}</time>
          <strong>{item.staff?.hasStaff ? item.staff.name : "Chưa cập nhật"}</strong>
          <span>{item.action}</span>
          {item.note ? <p>{item.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function TableSkeleton({ columns = 10, rows = 5 }) {
  return (
    <table className="admin-table admin-order-table admin-orders-table">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th key={`heading-${index}`}>
              <span className="skeleton-line order-skeleton-line" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {Array.from({ length: columns }).map((_, cellIndex) => (
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

function DetailSkeleton() {
  return (
    <div className="order-detail-skeleton">
      <span className="skeleton-line skeleton-line--title" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line--short" />
    </div>
  );
}

function ConfirmDialog({
  confirmLabel = "Xác nhận",
  description,
  onCancel,
  onConfirm,
  pending,
  title,
  tone = "primary",
}) {
  return (
    <div className="modal-backdrop order-confirm-backdrop" role="presentation">
      <section aria-modal="true" className="order-confirm-modal" role="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button disabled={pending} onClick={onCancel} type="button">
            Đóng
          </button>
          <button
            className={tone === "danger" ? "danger-button" : "primary-button"}
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function CancelOrderDialog({ onClose, onConfirm, pending }) {
  const [reason, setReason] = useState("");

  return (
    <div className="modal-backdrop order-confirm-backdrop" role="presentation">
      <section aria-modal="true" className="order-confirm-modal" role="dialog">
        <h2>Hủy đơn hàng</h2>
        <label className="order-cancel-reason">
          <span>Lý do</span>
          <textarea
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nhập lý do hủy đơn..."
            rows={5}
            value={reason}
          />
        </label>
        <div className="modal-actions">
          <button disabled={pending} onClick={onClose} type="button">
            Đóng
          </button>
          <button
            className="danger-button"
            disabled={pending || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            type="button"
          >
            {pending ? "Đang hủy..." : "Xác nhận"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ComplaintPanel({ contact }) {
  return (
    <div className="order-contact-panel">
      <StaffSummary staff={contact} />
      <dl>
        <div>
          <dt>Tên nhân viên phụ trách</dt>
          <dd>{contact.name}</dd>
        </div>
        <div>
          <dt>Số điện thoại</dt>
          <dd>{contact.phone}</dd>
        </div>
      </dl>
      <div className="order-contact-actions">
        <a className="primary-button" href={`tel:${contact.phone}`}>
          Gọi ngay
        </a>
        <a className="secondary-button" href={`sms:${contact.phone}`}>
          Nhắn tin
        </a>
      </div>
      {contact.source === "admin" ? (
        <p className="muted-text">Đơn hàng chưa có staff nên hệ thống hiển thị thông tin Admin.</p>
      ) : null}
    </div>
  );
}

function RefundPanel({ disabled, onRefundStatusChange, orderId, refundInfo }) {
  const status = normalizeWorkflowKey(refundInfo.status);

  return (
    <div className="order-refund-panel">
      <WorkflowTimeline items={refundInfo.timeline} variant="refund" />
      <div className="order-refund-actions">
        <button
          disabled={disabled || ["approved", "refunding", "refunded"].includes(status)}
          onClick={() => onRefundStatusChange(orderId, "approved")}
          type="button"
        >
          Duyệt hoàn tiền
        </button>
        <button
          disabled={disabled || ["refunding", "refunded"].includes(status)}
          onClick={() => onRefundStatusChange(orderId, "refunding")}
          type="button"
        >
          Đang hoàn tiền
        </button>
        <button
          disabled={disabled || status === "refunded"}
          onClick={() => onRefundStatusChange(orderId, "refunded")}
          type="button"
        >
          Hoàn tất
        </button>
      </div>
    </div>
  );
}

function OrderDetailModal({
  actionPending,
  errorMessage,
  loading,
  onAssign,
  onCancelOrder,
  onClose,
  onRefundStatusChange,
  onStatusChange,
  order,
  updating,
}) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const normalizedOrder = useMemo(
    () => normalizeOrder(order || {}),
    [order],
  );
  const orderTitle = normalizedOrder.orderCode || normalizedOrder.id;
  const totals = normalizedOrder.totals;
  const timeline = useMemo(() => buildOrderTimeline(order || {}), [order]);
  const refundInfo = useMemo(() => getRefundInfo(order || {}), [order]);
  const history = useMemo(() => getProcessingHistory(order || {}), [order]);
  const complaintContact = useMemo(() => getComplaintContact(order || {}), [order]);
  const cancelable = canCancelOrder(normalizedOrder.status);
  const shippingLocked = ["shipping", "shipped", "delivering", "delivered", "completed"].includes(
    normalizeWorkflowKey(normalizedOrder.status),
  );
  const tabs = [
    { key: "timeline", label: "Timeline" },
    { key: "complaints", label: "Khiếu nại" },
    { key: "refund", label: "Refund" },
    { key: "history", label: "Lịch sử xử lý" },
    { key: "items", label: "Sản phẩm" },
  ];

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="order-detail-modal admin-order-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <span>Chi tiết đơn hàng</span>
            <h2>{orderTitle ? `#${orderTitle}` : "Đơn hàng"}</h2>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {loading ? <DetailSkeleton /> : null}
        <StatusMessage tone="error">{errorMessage}</StatusMessage>

        {!loading && order ? (
          <div className="order-detail-content admin-order-detail-content">
            <div className="admin-order-detail-grid admin-order-detail-grid--wide">
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

              <article className="order-staff-card">
                <h3>Staff phụ trách</h3>
                {normalizedOrder.staff.hasStaff ? (
                  <dl>
                    <div>
                      <dt>Tên</dt>
                      <dd>{normalizedOrder.staff.name}</dd>
                    </div>
                    <div>
                      <dt>SĐT</dt>
                      <dd>{normalizedOrder.staff.phone || "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{normalizedOrder.staff.email || "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt>Ngày nhận xử lý</dt>
                      <dd>{formatDateTime(normalizedOrder.staff.assignedAt)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="order-staff-waiting">
                    Đang chờ nhân viên tiếp nhận.
                    <button disabled={actionPending} onClick={() => onAssign(normalizedOrder.id)} type="button">
                      Nhận xử lý
                    </button>
                  </div>
                )}
              </article>
            </div>

            <div className="admin-order-status-stack admin-order-status-stack--actions">
              <OrderStatusControl
                currentLabel={normalizedOrder.statusLabel}
                disabled={updating}
                onChange={(nextStatus) =>
                  onStatusChange(normalizedOrder.id, nextStatus, normalizedOrder.statusLabel)
                }
                status={normalizedOrder.status}
              />
              <PaymentStatusBadge
                label={normalizedOrder.paymentStatusLabel}
                value={normalizedOrder.paymentStatus}
              />
              {cancelable ? (
                <button
                  className="danger-button"
                  disabled={actionPending}
                  onClick={() => setShowCancelDialog(true)}
                  type="button"
                >
                  Hủy đơn
                </button>
              ) : null}
              {shippingLocked ? (
                <p className="order-cancel-locked">
                  Đơn hàng đã chuyển sang giai đoạn vận chuyển nên không thể hủy.
                </p>
              ) : null}
            </div>

            <div className="order-detail-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab.key ? "active" : ""}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "timeline" ? (
              <WorkflowTimeline items={timeline} />
            ) : null}

            {activeTab === "complaints" ? (
              <ComplaintPanel contact={complaintContact} />
            ) : null}

            {activeTab === "refund" ? (
              <RefundPanel
                disabled={actionPending}
                onRefundStatusChange={onRefundStatusChange}
                orderId={normalizedOrder.id}
                refundInfo={refundInfo}
              />
            ) : null}

            {activeTab === "history" ? (
              <ProcessingHistoryTimeline items={history} />
            ) : null}

            {activeTab === "items" ? (
              <>
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
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {showCancelDialog ? (
        <CancelOrderDialog
          onClose={() => setShowCancelDialog(false)}
          onConfirm={async (reason) => {
            await onCancelOrder(normalizedOrder.id, reason);
            setShowCancelDialog(false);
          }}
          pending={actionPending}
        />
      ) : null}
    </div>
  );
}

export default function OrderListPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState(null);
  const [detailState, setDetailState] = useState({
    open: false,
    order: null,
    orderId: null,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const invalidateOrderQueries = async (orderId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      orderId
        ? queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] })
        : Promise.resolve(),
    ]);
  };

  const ordersQuery = useQuery({
    queryFn: async () => {
      const payload = await adminService.getOrders();
      return readOrders(payload).map(normalizeOrder);
    },
    queryKey: ["admin", "orders"],
  });

  const detailQuery = useQuery({
    enabled: detailState.open && Boolean(detailState.orderId),
    queryFn: async () => {
      const payload = await adminService.getOrder(detailState.orderId, {
        suppressGlobalError: true,
      });
      return readOrderDetail(payload);
    },
    queryKey: ["admin", "order", detailState.orderId],
  });

  const assignOrderMutation = useMutation({
    mutationFn: ({ orderId }) =>
      adminService.assignOrder(orderId, {
        staff_id: user?.id,
        staff_name: user?.full_name || user?.fullName || user?.name || user?.email,
      }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể nhận xử lý đơn hàng."), "error");
    },
    onSuccess: async (_, variables) => {
      showToast("Đã nhận xử lý đơn hàng.", "success");
      await invalidateOrderQueries(variables.orderId);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      adminService.updateOrderStatus(orderId, { status }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể cập nhật trạng thái đơn hàng."), "error");
    },
    onSuccess: async (_, variables) => {
      showToast("Đã cập nhật trạng thái đơn hàng.", "success");
      await invalidateOrderQueries(variables.orderId);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }) =>
      adminService.cancelOrder(orderId, {
        cancel_reason: reason,
        reason,
      }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể hủy đơn hàng."), "error");
    },
    onSuccess: async (_, variables) => {
      showToast("Đã hủy đơn hàng.", "success");
      await invalidateOrderQueries(variables.orderId);
    },
  });

  const refundStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      adminService.updateRefundStatus(orderId, {
        refund_status: status,
        status,
      }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể cập nhật hoàn tiền."), "error");
    },
    onSuccess: async (_, variables) => {
      showToast("Đã cập nhật trạng thái hoàn tiền.", "success");
      await invalidateOrderQueries(variables.orderId);
    },
  });

  const orders = ordersQuery.data ?? EMPTY_ORDERS;
  const errorMessage = ordersQuery.error
    ? getStatusErrorMessage(ordersQuery.error, "Không thể tải danh sách đơn hàng.")
    : "";
  const actionPending =
    assignOrderMutation.isPending ||
    updateStatusMutation.isPending ||
    cancelOrderMutation.isPending ||
    refundStatusMutation.isPending;

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesSearch(
          searchTerm,
          order.orderCode,
          order.id,
          order.customerName,
          order.contact,
          order.staff.name,
          order.staff.phone,
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
        normalizeWorkflowKey(order.paymentStatus),
      ),
    ).length;
    const pendingOrders = orders.filter((order) =>
      ["pending", "confirmed", "processing"].includes(
        normalizeWorkflowKey(order.status),
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

  const selectedOrder =
    detailQuery.data ||
    detailState.order ||
    null;
  const detailLoading = detailState.open && detailState.orderId
    ? detailQuery.isLoading || detailQuery.isFetching
    : false;
  const detailErrorMessage = detailQuery.error && !detailState.order
    ? getStatusErrorMessage(detailQuery.error, "Không thể tải chi tiết đơn hàng.")
    : "";

  const handleOpenDetail = (order) => {
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

  const requestAssignOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    setConfirmAction({
      confirmLabel: "Nhận xử lý",
      description: "Bạn chắc chắn muốn nhận xử lý đơn hàng này?",
      onConfirm: () => assignOrderMutation.mutateAsync({ orderId }),
      title: "Xác nhận nhận xử lý",
    });
  };

  const requestStatusChange = (orderId, status, currentLabel = "") => {
    if (!orderId || !status) {
      return;
    }

    setConfirmAction({
      confirmLabel: "Cập nhật",
      description: `Chuyển trạng thái từ "${currentLabel || "hiện tại"}" sang "${getOrderStatusLabel(status)}"?`,
      onConfirm: () => updateStatusMutation.mutateAsync({ orderId, status }),
      title: "Xác nhận cập nhật trạng thái",
    });
  };

  const requestRefundStatusChange = (orderId, status) => {
    if (!orderId || !status) {
      return;
    }

    setConfirmAction({
      confirmLabel: "Xác nhận",
      description: `Cập nhật trạng thái hoàn tiền sang "${getOrderStatusLabel(status)}"?`,
      onConfirm: () => refundStatusMutation.mutateAsync({ orderId, status }),
      title: "Xác nhận duyệt hoàn tiền",
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction?.onConfirm) {
      return;
    }

    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
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
              placeholder="Mã đơn, khách hàng, email, SĐT, staff..."
              type="search"
              value={searchTerm}
            />
          </label>
          <button disabled={ordersQuery.isFetching} onClick={() => ordersQuery.refetch()} type="button">
            {ordersQuery.isFetching ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        {ordersQuery.isLoading ? <TableSkeleton /> : null}

        {!ordersQuery.isLoading && filteredOrders.length === 0 ? (
          <div className="admin-empty-state">
            <h2>Chưa có đơn hàng</h2>
            <p>Dữ liệu đơn hàng từ backend sẽ hiển thị tại đây.</p>
          </div>
        ) : null}

        {!ordersQuery.isLoading && filteredOrders.length > 0 ? (
          <table className="admin-table admin-order-table admin-orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Email/SĐT</th>
                <th>Staff phụ trách</th>
                <th>Thời gian nhận xử lý</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái hiện tại</th>
                <th>Thanh toán</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isOrderUpdating =
                  (assignOrderMutation.isPending && assignOrderMutation.variables?.orderId === order.id) ||
                  (updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id);

                return (
                  <tr key={order.id || order.orderCode}>
                    <td className="admin-link">#{order.orderCode || order.id}</td>
                    <td>
                      <strong>{order.customerName}</strong>
                    </td>
                    <td>{order.contact}</td>
                    <td>
                      <StaffSummary
                        action={
                          !order.staff.hasStaff ? (
                            <button
                              disabled={actionPending}
                              onClick={() => requestAssignOrder(order.id)}
                              type="button"
                            >
                              Nhận xử lý
                            </button>
                          ) : null
                        }
                        staff={order.staff}
                      />
                    </td>
                    <td>{formatDateTime(order.staff.assignedAt)}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{formatCurrency(order.totals.finalAmount)}</td>
                    <td>
                      <OrderStatusControl
                        currentLabel={order.statusLabel}
                        disabled={isOrderUpdating}
                        onChange={(status) =>
                          requestStatusChange(order.id, status, order.statusLabel)
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
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      {detailState.open ? (
        <OrderDetailModal
          actionPending={actionPending}
          errorMessage={detailErrorMessage}
          loading={detailLoading}
          onAssign={requestAssignOrder}
          onCancelOrder={(orderId, reason) =>
            cancelOrderMutation.mutateAsync({ orderId, reason })
          }
          onClose={handleCloseDetail}
          onRefundStatusChange={requestRefundStatusChange}
          onStatusChange={requestStatusChange}
          order={selectedOrder}
          updating={actionPending}
        />
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          confirmLabel={confirmAction.confirmLabel}
          description={confirmAction.description}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          pending={actionPending}
          title={confirmAction.title}
          tone={confirmAction.tone}
        />
      ) : null}
    </section>
  );
}
