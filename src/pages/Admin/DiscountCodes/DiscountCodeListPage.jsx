import { useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import StatusMessage from "../../../components/StatusMessage";
import DiscountActionModal from "../../../components/discount/DiscountActionModal";
import DiscountStatusBadge from "../../../components/discount/DiscountStatusBadge";
import { useToast } from "../../../context/ToastContext";
import { useDiscountCodes, useDiscountMutation } from "../../../hooks/useDiscountCodes";
import { deactivateDiscountCode, deleteDiscountCode } from "../../../services/discountCodeApi";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { DISCOUNT_STATUSES, DISCOUNT_TYPES, formatDiscountDate } from "../../../utils/discountCodes";
import { formatCurrency } from "../../../utils/formatters";

export default function DiscountCodeListPage(){
  const {showToast}=useToast();const [target,setTarget]=useState(null);
  const [filters,setFilters]=useState({search:"",status:"",discount_type:"",validity:"",sort_by:"created_at",sort_direction:"desc",page:1,per_page:10});
  const query=useDiscountCodes(filters);const data=query.data||{items:[],pagination:{page:1,lastPage:1,total:0}};
  const action=useDiscountMutation((code)=>code.canOnlyDeactivate?deactivateDiscountCode(code.id):deleteDiscountCode(code.id));
  const confirm=async()=>{try{const used=target.canOnlyDeactivate;await action.mutateAsync(target);showToast(used?"Mã giảm giá đã được ngừng áp dụng":"Xóa mã giảm giá thành công","success");setTarget(null);}
    catch(e){showToast(getStatusErrorMessage(e,"Mã giảm giá không tồn tại hoặc không thể xử lý."),"error");setTarget(null);query.refetch();}};
  return <section className="admin-page discount-admin-page"><div className="admin-page-heading"><div><span>Khuyến mãi</span><h1>Mã giảm giá</h1><p>{data.pagination.total} mã từ Backend.</p></div>
    <Link className="primary-button" to="/admin/discount-codes/create">Thêm mã giảm giá</Link></div>
    <div className="admin-filter-card discount-filters"><label><span>Tìm kiếm</span><input value={filters.search} onChange={e=>setFilters(x=>({...x,search:e.target.value,page:1}))}/></label>
      <label><span>Trạng thái</span><select value={filters.status} onChange={e=>setFilters(x=>({...x,status:e.target.value,page:1}))}><option value="">Tất cả</option>{Object.entries(DISCOUNT_STATUSES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>Loại giảm</span><select value={filters.discount_type} onChange={e=>setFilters(x=>({...x,discount_type:e.target.value,page:1}))}><option value="">Tất cả</option>{Object.entries(DISCOUNT_TYPES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>Hiệu lực</span><select value={filters.validity} onChange={e=>setFilters(x=>({...x,validity:e.target.value,page:1}))}><option value="">Tất cả</option><option value="effective">Còn hiệu lực</option><option value="expiring">Sắp hết hạn</option><option value="expired">Hết hạn</option></select></label>
      <label><span>Sắp xếp</span><select value={filters.sort_direction} onChange={e=>setFilters(x=>({...x,sort_direction:e.target.value,page:1}))}><option value="desc">Mới nhất</option><option value="asc">Cũ nhất</option></select></label></div>
    {query.error?<StatusMessage tone="error">{getStatusErrorMessage(query.error,"Không thể tải mã giảm giá.")}<button onClick={()=>query.refetch()} type="button">Thử lại</button></StatusMessage>:null}
    {query.isLoading?<div className="discount-skeleton"><span className="skeleton-line"/><span className="skeleton-line"/></div>:null}
    {!query.isLoading&&!query.error&&!data.items.length?<div className="empty-state"><h2>Chưa có mã giảm giá</h2></div>:null}
    {data.items.length?<div className="admin-table-wrap"><table className="admin-table discount-table"><thead><tr><th>Mã</th><th>Chương trình</th><th>Loại</th><th>Giá trị</th><th>Đơn tối thiểu</th><th>Đã dùng / giới hạn</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {data.items.map(code=><tr key={code.id}><td><strong>{code.code}</strong></td><td>{code.name}</td><td>{DISCOUNT_TYPES[code.type]||code.type}</td>
        <td>{code.type==="percentage"?`${code.value}%`:formatCurrency(code.value)}</td><td>{formatCurrency(code.minOrder)}</td><td>{code.usageCount} / {code.usageLimit||"∞"}</td>
        <td>{formatDiscountDate(code.startAt)}</td><td>{formatDiscountDate(code.endAt)}</td><td><DiscountStatusBadge status={code.status}/></td><td><div className="discount-actions">
          <Link to={`/admin/discount-codes/${code.id}`}>Chi tiết</Link>{code.status==="active"?<button className={code.canOnlyDeactivate?"":"danger-button"} onClick={()=>setTarget(code)} type="button">{code.canOnlyDeactivate?"Ngừng áp dụng":"Xóa"}</button>:null}</div></td></tr>)}</tbody></table></div>:null}
    <Pagination disabled={query.isFetching} page={data.pagination.page} totalPages={data.pagination.lastPage} onChange={page=>setFilters(x=>({...x,page}))}/>
    {target?<DiscountActionModal code={target} pending={action.isPending} onClose={()=>setTarget(null)} onConfirm={confirm}/>:null}</section>;
}
