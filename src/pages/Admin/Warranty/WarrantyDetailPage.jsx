import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApproveWarrantyModal from "../../../components/warranty/ApproveWarrantyModal";
import RejectWarrantyModal from "../../../components/warranty/RejectWarrantyModal";
import WarrantyDetail from "../../../components/warranty/WarrantyDetail";
import StatusMessage from "../../../components/StatusMessage";
import { useToast } from "../../../context/ToastContext";
import { useAdminWarrantyDetail, useWarrantyMutation } from "../../../hooks/useWarrantyRequests";
import { approveWarrantyRequest, completeWarrantyRequest, markWarrantyProcessing, rejectWarrantyRequest } from "../../../services/warrantyApi";
import { getStatusErrorMessage } from "../../../utils/apiErrors";

export default function WarrantyDetailPage(){
  const {id}=useParams();const {showToast}=useToast();const [modal,setModal]=useState("");
  const query=useAdminWarrantyDetail(id);const mutation=useWarrantyMutation(({type,payload})=>{
    if(type==="approve")return approveWarrantyRequest(id,payload);if(type==="reject")return rejectWarrantyRequest(id,payload);
    if(type==="processing")return markWarrantyProcessing(id,payload);return completeWarrantyRequest(id,payload);
  });
  const run=async(type,payload={})=>{try{await mutation.mutateAsync({type,payload});showToast("Cập nhật yêu cầu bảo hành thành công","success");setModal("");query.refetch();}
    catch(e){showToast(getStatusErrorMessage(e,Number(e?.response?.status)===404?"Yêu cầu bảo hành không tồn tại":"Trạng thái yêu cầu đã thay đổi hoặc không thể cập nhật."),"error");query.refetch();}};
  const r=query.data;
  return <section className="admin-page warranty-admin-page"><div className="admin-page-heading"><div><span>Bảo hành</span><h1>Chi tiết yêu cầu</h1></div>
    <Link className="secondary-button" to="/admin/warranty-requests">Danh sách</Link></div>
    {query.isLoading?<div className="warranty-skeleton"><span className="skeleton-line"/></div>:null}
    {query.error?<StatusMessage tone="error">{getStatusErrorMessage(query.error,"Không thể tải chi tiết yêu cầu.")}</StatusMessage>:null}
    {r?<div className="account-panel"><WarrantyDetail request={r}/><div className="modal-actions">
      {r.status==="pending"?<><button className="primary-button" onClick={()=>setModal("approve")} type="button">Duyệt</button><button className="danger-button" onClick={()=>setModal("reject")} type="button">Từ chối</button></>:null}
      {r.status==="approved"?<button disabled={mutation.isPending} onClick={()=>run("processing")} type="button">Chuyển sang đang xử lý</button>:null}
      {r.status==="processing"?<button className="primary-button" disabled={mutation.isPending} onClick={()=>run("complete")} type="button">Hoàn tất</button>:null}
    </div></div>:null}
    {modal==="approve"?<ApproveWarrantyModal request={r} pending={mutation.isPending} onClose={()=>setModal("")} onConfirm={(p)=>run("approve",p)}/>:null}
    {modal==="reject"?<RejectWarrantyModal request={r} pending={mutation.isPending} onClose={()=>setModal("")} onConfirm={(p)=>run("reject",p)}/>:null}
  </section>;
}
