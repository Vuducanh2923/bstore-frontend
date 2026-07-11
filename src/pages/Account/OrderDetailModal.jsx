import { getOrderCode } from "../../utils/orders";
import OrderDetailView from "./OrderDetailView";

export default function OrderDetailModal({
  actionPending,
  errorMessage,
  loading,
  onCancelOrder,
  onClose,
  order,
}) {
  const orderCode = getOrderCode(order || {});

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="order-detail-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <span>Chi tiết đơn hàng</span>
            <h2>{orderCode ? `#${orderCode}` : "Đơn hàng"}</h2>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <OrderDetailView
          actionPending={actionPending}
          errorMessage={errorMessage}
          loading={loading}
          onCancelOrder={onCancelOrder}
          order={order}
        />
      </section>
    </div>
  );
}
