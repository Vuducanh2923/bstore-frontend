import WarrantyStatusBadge from "./WarrantyStatusBadge";
import WarrantyTimeline from "./WarrantyTimeline";
import { formatWarrantyDate } from "../../utils/warranty";

export default function WarrantyDetail({ request }) {
  return <div className="warranty-detail-grid">
    <article className="warranty-product-card">
      {request.productImage ? <img alt={request.productName} src={request.productImage} /> : null}
      <div><span>Sản phẩm</span><h2>{request.productName}</h2>
        <p>Đơn hàng #{request.orderCode || request.orderId}</p></div>
    </article>
    <article><h3>Thông tin yêu cầu</h3><dl className="warranty-summary-list">
      <div><dt>Mã yêu cầu</dt><dd>#{request.code}</dd></div>
      <div><dt>Trạng thái</dt><dd><WarrantyStatusBadge status={request.status} label={request.statusLabel} /></dd></div>
      <div><dt>Ngày gửi</dt><dd>{formatWarrantyDate(request.submittedAt, true)}</dd></div>
      <div><dt>Lý do</dt><dd>{request.reason || "Chưa cập nhật"}</dd></div>
      <div><dt>Mô tả</dt><dd>{request.description || "Không có"}</dd></div>
    </dl></article>
    <article><h3>Chính sách và xử lý</h3><dl className="warranty-summary-list">
      <div><dt>Chính sách</dt><dd>{request.policyName || request.policyDescription || "Chưa cập nhật"}</dd></div>
      <div><dt>Thời hạn</dt><dd>{formatWarrantyDate(request.startDate)} – {formatWarrantyDate(request.expiryDate)}</dd></div>
      <div><dt>Người xử lý</dt><dd>{request.handlerName || "Chưa phân công"}</dd></div>
      <div><dt>Ghi chú</dt><dd>{request.processingNote || "Chưa có"}</dd></div>
      {request.rejectionReason ? <div><dt>Lý do từ chối</dt><dd className="field-error">{request.rejectionReason}</dd></div> : null}
      {request.handledAt ? <div><dt>Thời gian xử lý</dt><dd>{formatWarrantyDate(request.handledAt, true)}</dd></div> : null}
    </dl></article>
    <WarrantyTimeline items={request.timeline} />
  </div>;
}
