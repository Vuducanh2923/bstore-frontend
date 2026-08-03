export default function DiscountActionModal({code,pending,onClose,onConfirm}) {
  const used=code.canOnlyDeactivate || !code.canDelete;
  return <div className="modal-backdrop" role="presentation"><section className="account-modal discount-action-modal" role="dialog" aria-modal="true">
    <div className="modal-heading"><div><span>{used?"Ngừng áp dụng":"Xóa mã"}</span><h2>{code.code}</h2></div>
      <button disabled={pending} onClick={onClose} type="button">×</button></div>
    <dl className="discount-detail-list"><div><dt>Chương trình</dt><dd>{code.name}</dd></div>
      <div><dt>Đã sử dụng</dt><dd>{code.usageCount} lượt</dd></div></dl>
    <p>{used?"Mã giảm giá đã được sử dụng và không thể xóa khỏi lịch sử. Hệ thống sẽ chuyển mã sang trạng thái Ngừng áp dụng.":
      "Mã giảm giá chưa được sử dụng. Bạn có chắc chắn muốn xóa?"}</p>
    <div className="modal-actions"><button disabled={pending} onClick={onClose} type="button">Hủy</button>
      <button className={used?"primary-button":"danger-button"} disabled={pending} onClick={onConfirm} type="button">
        {pending?"Đang xử lý...":used?"Ngừng áp dụng":"Xác nhận xóa"}</button></div>
  </section></div>;
}
