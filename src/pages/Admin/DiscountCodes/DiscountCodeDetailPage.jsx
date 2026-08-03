import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DiscountActionModal from "../../../components/discount/DiscountActionModal";
import DiscountStatusBadge from "../../../components/discount/DiscountStatusBadge";
import StatusMessage from "../../../components/StatusMessage";
import { useToast } from "../../../context/ToastContext";
import { useDiscountCode, useDiscountMutation } from "../../../hooks/useDiscountCodes";
import { deactivateDiscountCode, deleteDiscountCode } from "../../../services/discountCodeApi";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { DISCOUNT_TYPES, formatDiscountDate } from "../../../utils/discountCodes";
import { formatCurrency } from "../../../utils/formatters";

export default function DiscountCodeDetailPage(){
  const {id}=useParams();const navigate=useNavigate();const {showToast}=useToast();const [open,setOpen]=useState(false);
  const query=useDiscountCode(id);const code=query.data;
  const action=useDiscountMutation(()=>code.canOnlyDeactivate?deactivateDiscountCode(id):deleteDiscountCode(id));
  const confirm=async()=>{try{const used=code.canOnlyDeactivate;await action.mutateAsync();showToast(used?"Mã giảm giá đã được ngừng áp dụng":"Xóa mã giảm giá thành công","success");navigate("/admin/discount-codes");}
    catch(e){showToast(getStatusErrorMessage(e,"Không thể xử lý mã giảm giá."),"error");setOpen(false);query.refetch();}};
  return <section className="admin-page discount-admin-page"><div className="admin-page-heading"><div><span>Khuyến mãi</span><h1>Chi tiết mã giảm giá</h1></div>
    <Link className="secondary-button" to="/admin/discount-codes">Danh sách</Link></div>
    {query.isLoading?<div className="discount-skeleton"><span className="skeleton-line"/></div>:null}
    {query.error?<StatusMessage tone="error">{getStatusErrorMessage(query.error,"Không thể tải mã giảm giá.")}</StatusMessage>:null}
    {code?<div className="admin-card discount-detail"><div className="discount-code-heading"><strong>{code.code}</strong><DiscountStatusBadge status={code.status}/></div>
      <dl className="discount-detail-list"><div><dt>Chương trình</dt><dd>{code.name}</dd></div><div><dt>Mô tả</dt><dd>{code.description||"Không có"}</dd></div>
        <div><dt>Loại giảm</dt><dd>{DISCOUNT_TYPES[code.type]||code.type}</dd></div><div><dt>Giá trị</dt><dd>{code.type==="percentage"?`${code.value}%`:formatCurrency(code.value)}</dd></div>
        <div><dt>Giảm tối đa</dt><dd>{code.maxDiscount?formatCurrency(code.maxDiscount):"Không giới hạn"}</dd></div><div><dt>Đơn tối thiểu</dt><dd>{formatCurrency(code.minOrder)}</dd></div>
        <div><dt>Đã dùng / giới hạn</dt><dd>{code.usageCount} / {code.usageLimit||"Không giới hạn"}</dd></div><div><dt>Mỗi khách hàng</dt><dd>{code.perCustomerLimit||"Không giới hạn"}</dd></div>
        <div><dt>Bắt đầu</dt><dd>{formatDiscountDate(code.startAt,true)}</dd></div><div><dt>Kết thúc</dt><dd>{formatDiscountDate(code.endAt,true)}</dd></div>
        <div><dt>Người tạo</dt><dd>{code.creator||"Chưa cập nhật"}</dd></div><div><dt>Ngày tạo</dt><dd>{formatDiscountDate(code.createdAt,true)}</dd></div></dl>
      {code.status==="active"?<div className="modal-actions"><button className={code.canOnlyDeactivate?"primary-button":"danger-button"} onClick={()=>setOpen(true)} type="button">{code.canOnlyDeactivate?"Ngừng áp dụng":"Xóa mã"}</button></div>:null}</div>:null}
    {open?<DiscountActionModal code={code} pending={action.isPending} onClose={()=>setOpen(false)} onConfirm={confirm}/>:null}</section>;
}
