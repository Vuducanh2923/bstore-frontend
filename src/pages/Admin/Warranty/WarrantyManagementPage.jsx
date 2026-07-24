import { useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import StatusMessage from "../../../components/StatusMessage";
import ApproveWarrantyModal from "../../../components/warranty/ApproveWarrantyModal";
import RejectWarrantyModal from "../../../components/warranty/RejectWarrantyModal";
import WarrantyStatusBadge from "../../../components/warranty/WarrantyStatusBadge";
import { useToast } from "../../../context/ToastContext";
import { useAdminWarranties, useWarrantyMutation } from "../../../hooks/useWarrantyRequests";
import { approveWarrantyRequest, rejectWarrantyRequest } from "../../../services/warrantyApi";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { formatWarrantyDate, WARRANTY_STATUSES } from "../../../utils/warranty";

export default function WarrantyManagementPage() {
  const {showToast}=useToast(); const [action,setAction]=useState(null);
  const [filters,setFilters]=useState({search:"",status:"",date_from:"",date_to:"",sort:"newest",page:1,per_page:10});
  const query=useAdminWarranties(filters); const data=query.data||{items:[],pagination:{page:1,lastPage:1,total:0}};
  const approve=useWarrantyMutation(({id,payload})=>approveWarrantyRequest(id,payload));
  const reject=useWarrantyMutation(({id,payload})=>rejectWarrantyRequest(id,payload));
  const run=async(type,payload)=>{
    const mutation=type==="approve"?approve:reject;
    try {await mutation.mutateAsync({id:action.request.id,payload});showToast(type==="approve"?"Duyệt yêu cầu bảo hành thành công":"Từ chối yêu cầu bảo hành thành công","success");setAction(null);}
    catch(error){const status=Number(error?.response?.status||0);showToast(status===404?"Yêu cầu bảo hành không tồn tại":status===409?"Trạng thái yêu cầu đã thay đổi":getStatusErrorMessage(error,"Không thể xử lý yêu cầu."),"error");query.refetch();}
  };
  return <section className="admin-page admin-management-page warranty-admin-page"><div className="admin-page-heading"><div><span>Bảo hành</span>
    <h1>Quản lý yêu cầu bảo hành</h1><p>{data.pagination.total} yêu cầu từ Backend.</p></div></div>
    <div className="admin-filter-card warranty-filters">
      <label><span>Tìm kiếm</span><input value={filters.search} onChange={(e)=>setFilters(x=>({...x,search:e.target.value,page:1}))}/></label>
      <label><span>Trạng thái</span><select value={filters.status} onChange={(e)=>setFilters(x=>({...x,status:e.target.value,page:1}))}><option value="">Tất cả</option>
        {Object.entries(WARRANTY_STATUSES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>Từ ngày</span><input type="date" value={filters.date_from} onChange={(e)=>setFilters(x=>({...x,date_from:e.target.value,page:1}))}/></label>
      <label><span>Đến ngày</span><input type="date" value={filters.date_to} onChange={(e)=>setFilters(x=>({...x,date_to:e.target.value,page:1}))}/></label>
      <label><span>Sắp xếp</span><select value={filters.sort} onChange={(e)=>setFilters(x=>({...x,sort:e.target.value,page:1}))}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select></label>
    </div>
    {query.error?<StatusMessage tone="error">{getStatusErrorMessage(query.error,"Không thể tải danh sách.")}<button onClick={()=>query.refetch()} type="button">Thử lại</button></StatusMessage>:null}
    {query.isLoading?<div className="warranty-skeleton"><span className="skeleton-line"/><span className="skeleton-line"/></div>:null}
    {!query.isLoading&&!query.error&&!data.items.length?<div className="empty-state"><h2>Không có yêu cầu phù hợp</h2></div>:null}
    {data.items.length?<div className="admin-table-wrap"><table className="admin-table warranty-admin-table"><thead><tr><th>Mã</th><th>Khách hàng</th><th>Đơn hàng</th><th>Sản phẩm</th><th>Lý do</th><th>Trạng thái</th><th>Ngày gửi</th><th>Người xử lý</th><th>Thao tác</th></tr></thead>
      <tbody>{data.items.map(item=><tr key={item.id}><td>#{item.code}</td><td>{item.customerName}</td><td>#{item.orderCode}</td><td>{item.productName}</td><td>{item.reason}</td>
        <td><WarrantyStatusBadge status={item.status}/></td><td>{formatWarrantyDate(item.submittedAt)}</td><td>{item.handlerName||"Chưa phân công"}</td><td><div className="warranty-actions">
          <Link to={`/admin/warranty-requests/${item.id}`}>Chi tiết</Link>{item.status==="pending"?<><button onClick={()=>setAction({type:"approve",request:item})} type="button">Duyệt</button>
          <button className="danger-button" onClick={()=>setAction({type:"reject",request:item})} type="button">Từ chối</button></>:null}</div></td></tr>)}</tbody></table></div>:null}
    <Pagination disabled={query.isFetching} page={data.pagination.page} totalPages={data.pagination.lastPage} onChange={(page)=>setFilters(x=>({...x,page}))}/>
    {action?.type==="approve"?<ApproveWarrantyModal request={action.request} pending={approve.isPending} onClose={()=>setAction(null)} onConfirm={(p)=>run("approve",p)}/>:null}
    {action?.type==="reject"?<RejectWarrantyModal request={action.request} pending={reject.isPending} onClose={()=>setAction(null)} onConfirm={(p)=>run("reject",p)}/>:null}
  </section>;
}
