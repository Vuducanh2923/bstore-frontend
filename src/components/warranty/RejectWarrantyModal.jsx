import { useState } from "react";

export default function RejectWarrantyModal({ request, pending, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (!reason.trim()) { setError("Vui lòng nhập lý do từ chối."); return; }
    onConfirm({ rejection_reason: reason.trim() });
  };
  return <div className="modal-backdrop" role="presentation">
    <section aria-modal="true" className="account-modal warranty-action-modal" role="dialog">
      <div className="modal-heading"><div><span>Từ chối bảo hành</span><h2>Yêu cầu #{request.code}</h2></div>
        <button disabled={pending} onClick={onClose} type="button">×</button></div>
      <p><strong>{request.productName}</strong></p>
      <label className="warranty-field"><span>Lý do từ chối *</span>
        <textarea rows="5" value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} />
        {error ? <small className="field-error">{error}</small> : null}</label>
      <div className="modal-actions">
        <button disabled={pending} onClick={onClose} type="button">Hủy</button>
        <button className="danger-button" disabled={pending} onClick={submit} type="button">
          {pending ? "Đang từ chối..." : "Xác nhận từ chối"}
        </button>
      </div>
    </section>
  </div>;
}
