import { useState } from "react";
import { formatWarrantyDate } from "../../utils/warranty";

export default function ApproveWarrantyModal({ request, pending, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  return <div className="modal-backdrop" role="presentation">
    <section aria-modal="true" className="account-modal warranty-action-modal" role="dialog">
      <div className="modal-heading"><div><span>Duyệt bảo hành</span><h2>Yêu cầu #{request.code}</h2></div>
        <button disabled={pending} onClick={onClose} type="button">×</button></div>
      <dl className="warranty-summary-list">
        <div><dt>Khách hàng</dt><dd>{request.customerName || "Chưa cập nhật"}</dd></div>
        <div><dt>Sản phẩm</dt><dd>{request.productName}</dd></div>
        <div><dt>Lý do</dt><dd>{request.reason}</dd></div>
        <div><dt>Hạn bảo hành</dt><dd>{formatWarrantyDate(request.expiryDate)}</dd></div>
      </dl>
      <label className="warranty-field"><span>Ghi chú xử lý</span>
        <textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="modal-actions">
        <button disabled={pending} onClick={onClose} type="button">Hủy</button>
        <button className="primary-button" disabled={pending}
          onClick={() => onConfirm({ processing_note: note.trim() })} type="button">
          {pending ? "Đang duyệt..." : "Xác nhận duyệt"}
        </button>
      </div>
    </section>
  </div>;
}
