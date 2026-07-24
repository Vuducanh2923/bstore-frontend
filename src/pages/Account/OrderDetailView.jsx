import { useState } from "react";
import { Link } from "react-router-dom";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import StatusBadge from "../../components/StatusBadge";
import StatusMessage from "../../components/StatusMessage";
import { formatCurrency } from "../../utils/formatters";
import {
  displayText,
  getOrderItems,
  getOrderTotals,
  getPaymentMethod,
  getReceiver,
  normalizeOrderItem,
  readOrder,
} from "../../utils/orders";
import {
  buildOrderTimeline,
  canCancelOrder,
  formatWorkflowDateTime,
  getComplaintContact,
  getProcessingHistory,
  getRefundInfo,
  getStaffInfo,
  getStaffInitials,
  normalizeWorkflowKey,
} from "../../utils/orderWorkflow";

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

function StaffSummary({ staff }) {
  if (!staff?.hasStaff) {
    return <p className="order-staff-waiting">Đang chờ nhân viên tiếp nhận.</p>;
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
                <dd>{formatWorkflowDateTime(item.time)}</dd>
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
          <time>{formatWorkflowDateTime(item.time)}</time>
          <strong>{item.staff?.hasStaff ? item.staff.name : "Chưa cập nhật"}</strong>
          <span>{item.action}</span>
          {item.note ? <p>{item.note}</p> : null}
        </li>
      ))}
    </ol>
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

export default function OrderDetailView({
  actionPending,
  errorMessage,
  loading,
  onCancelOrder,
  order,
}) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const normalizedOrder = readOrder(order || {});
  const receiver = getReceiver(normalizedOrder);
  const items = getOrderItems(normalizedOrder).map(normalizeOrderItem);
  const rawItems = getOrderItems(normalizedOrder);
  const shippingMethod = displayText(
    normalizedOrder.shipping_method ||
      normalizedOrder.delivery_method ||
      normalizedOrder.shippingMethod,
    "Chưa cập nhật",
  );
  const totals = getOrderTotals(normalizedOrder);
  const paymentMethod = getPaymentMethod(normalizedOrder);
  const status = displayText(normalizedOrder.status || normalizedOrder.order_status, "");
  const staff = getStaffInfo(normalizedOrder);
  const timeline = buildOrderTimeline(normalizedOrder);
  const refundInfo = getRefundInfo(normalizedOrder);
  const history = getProcessingHistory(normalizedOrder);
  const complaintContact = getComplaintContact(normalizedOrder);
  const cancelable = Boolean(onCancelOrder) && canCancelOrder(status);
  const shippingLocked = ["shipping", "shipped", "delivering", "delivered", "completed"].includes(
    normalizeWorkflowKey(status),
  );
  const tabs = [
    { key: "timeline", label: "Timeline" },
    { key: "complaints", label: "Khiếu nại" },
    { key: "refund", label: "Refund" },
    { key: "history", label: "Lịch sử xử lý" },
    { key: "items", label: "Sản phẩm" },
  ];

  return (
    <>
      {loading ? <DetailSkeleton /> : null}
      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      {!loading && order ? (
        <div className="order-detail-content">
          <div className="order-detail-summary order-detail-summary--three">
            <article>
              <h3>Người nhận</h3>
              <strong>{receiver.name || "Chưa cập nhật"}</strong>
              <span>{receiver.phone || "Chưa cập nhật"}</span>
              <p>{receiver.address || "Chưa cập nhật địa chỉ giao hàng"}</p>
            </article>
            <article>
              <h3>Vận chuyển</h3>
              <p>{shippingMethod}</p>
              <StatusBadge
                label={displayText(normalizedOrder.status_label, "")}
                value={status}
              />
              <PaymentStatusBadge
                label={displayText(normalizedOrder.payment_status_label, "")}
                value={displayText(normalizedOrder.payment_status, "")}
              />
            </article>
            <article className="order-staff-card">
              <h3>Staff phụ trách</h3>
              {staff.hasStaff ? (
                <dl>
                  <div>
                    <dt>Tên</dt>
                    <dd>{staff.name}</dd>
                  </div>
                  <div>
                    <dt>SĐT</dt>
                    <dd>{staff.phone || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{staff.email || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Ngày nhận xử lý</dt>
                    <dd>{formatWorkflowDateTime(staff.assignedAt)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="order-staff-waiting">Đang chờ nhân viên tiếp nhận.</p>
              )}
            </article>
          </div>

          <div className="order-cancel-panel">
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

          {activeTab === "timeline" ? <WorkflowTimeline items={timeline} /> : null}

          {activeTab === "complaints" ? (
            <ComplaintPanel contact={complaintContact} />
          ) : null}

          {activeTab === "refund" ? (
            <div className="order-refund-panel">
              <WorkflowTimeline items={refundInfo.timeline} variant="refund" />
            </div>
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
                      <th>Bảo hành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={`${item.productName}-${index}`}>
                        <td>{item.productName}</td>
                        <td>
                          {[item.color, item.ram, item.storage].filter(Boolean).join(" / ") || "-"}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.subtotal)}</td>
                        <td>
                          {(() => {
                            const raw = rawItems[index] || {};
                            const orderStatus = normalizeWorkflowKey(status);
                            const policy = raw.warranty_policy || raw.product?.warranty_policy;
                            const expiry = raw.warranty_expiry_date || raw.warranty_end_date;
                            const active = raw.has_active_warranty_request ||
                              raw.active_warranty_request ||
                              ["pending", "approved", "processing"].includes(
                                String(raw.warranty_request?.status || raw.warranty_status || "").toLowerCase(),
                              );
                            let reason = "";
                            if (!["delivered", "completed"].includes(orderStatus)) reason = "Đơn hàng chưa được giao.";
                            else if (!policy && !raw.has_warranty) reason = "Sản phẩm không có bảo hành.";
                            else if (expiry && new Date(expiry).getTime() < Date.now()) reason = "Sản phẩm đã hết hạn bảo hành.";
                            else if (active) reason = "Đã có yêu cầu đang xử lý.";
                            const itemId = raw.id ?? raw.order_item_id ?? raw.orderItemId;
                            const orderId = normalizedOrder.id ?? normalizedOrder.order_id;
                            return reason ? <span className="muted-text warranty-disabled-reason">{reason}</span> : (
                              <Link className="table-link-button"
                                to={`/account/warranty-requests/create?orderId=${encodeURIComponent(orderId)}&orderItemId=${encodeURIComponent(itemId)}`}>
                                Yêu cầu bảo hành
                              </Link>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="6">Không có sản phẩm trong đơn hàng.</td>
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
                  <dt>Thanh toán</dt>
                  <dd>
                    <strong>{formatCurrency(totals.finalAmount)}</strong>
                    <span>{paymentMethod}</span>
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>
      ) : null}

      {showCancelDialog ? (
        <CancelOrderDialog
          onClose={() => setShowCancelDialog(false)}
          onConfirm={async (reason) => {
            await onCancelOrder(reason);
            setShowCancelDialog(false);
          }}
          pending={actionPending}
        />
      ) : null}
    </>
  );
}
