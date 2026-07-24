import { Link, useParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import WarrantyDetail from "../../components/warranty/WarrantyDetail";
import { useCustomerWarrantyDetail, useWarrantyMutation } from "../../hooks/useWarrantyRequests";
import { cancelWarrantyRequest } from "../../services/warrantyApi";
import { useToast } from "../../context/ToastContext";
import { getStatusErrorMessage } from "../../utils/apiErrors";

export default function WarrantyRequestDetailPage() {
  const { id } = useParams(); const { showToast } = useToast();
  const query = useCustomerWarrantyDetail(id);
  const cancel = useWarrantyMutation(() => cancelWarrantyRequest(id));
  const handleCancel = async () => {
    try { await cancel.mutateAsync(); showToast("Đã hủy yêu cầu bảo hành.", "success"); }
    catch (e) { showToast(getStatusErrorMessage(e, "Không thể hủy yêu cầu."), "error"); }
  };
  return <main className="container warranty-page"><section className="page-heading"><div><span>Tài khoản</span>
    <h1>Chi tiết yêu cầu bảo hành</h1></div><Link className="secondary-button" to="/account/warranty-requests">Danh sách</Link></section>
    <section className="account-panel">{query.isLoading?<div className="warranty-skeleton"><span className="skeleton-line"/><span className="skeleton-line"/></div>:null}
      {query.error?<StatusMessage tone="error">{getStatusErrorMessage(query.error, "Không thể tải chi tiết yêu cầu.")}</StatusMessage>:null}
      {query.data?<><WarrantyDetail request={query.data}/>{query.data.status==="pending"?<div className="modal-actions">
        <button className="danger-button" disabled={cancel.isPending} onClick={handleCancel} type="button">
          {cancel.isPending?"Đang hủy...":"Hủy yêu cầu"}</button></div>:null}</>:null}</section></main>;
}
