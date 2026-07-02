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

export default function OrderDetailView({ errorMessage, loading, order }) {
  const normalizedOrder = readOrder(order || {});
  const receiver = getReceiver(normalizedOrder);
  const items = getOrderItems(normalizedOrder).map(normalizeOrderItem);
  const shippingMethod = displayText(
    normalizedOrder.shipping_method ||
      normalizedOrder.delivery_method ||
      normalizedOrder.shippingMethod,
    "Chưa cập nhật",
  );
  const totals = getOrderTotals(normalizedOrder);
  const paymentMethod = getPaymentMethod(normalizedOrder);

  return (
    <>
      {loading ? <p className="muted-text">Đang tải chi tiết đơn hàng...</p> : null}
      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      {!loading && order ? (
        <div className="order-detail-content">
          <div className="order-detail-summary">
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
                value={displayText(normalizedOrder.status, "")}
              />
              <PaymentStatusBadge
                label={displayText(normalizedOrder.payment_status_label, "")}
                value={displayText(normalizedOrder.payment_status, "")}
              />
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
                {items.map((item, index) => (
                  <tr key={`${item.productName}-${index}`}>
                    <td>{item.productName}</td>
                    <td>
                      {[item.color, item.ram, item.storage].filter(Boolean).join(" / ") || "-"}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
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
              <dt>Thanh toán</dt>
              <dd>
                <strong>{formatCurrency(totals.finalAmount)}</strong>
                <span>{paymentMethod}</span>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </>
  );
}
