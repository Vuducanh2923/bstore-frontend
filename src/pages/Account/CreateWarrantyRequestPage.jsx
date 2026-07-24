import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import { customerOrderService } from "../../services/bstoreService";
import { createWarrantyRequest } from "../../services/warrantyApi";
import { getFieldError, getStatusErrorMessage, getValidationErrors } from "../../utils/apiErrors";
import { getOrderCode, getOrderItems, normalizeOrderItem, readOrder } from "../../utils/orders";
import { formatWarrantyDate } from "../../utils/warranty";

export default function CreateWarrantyRequestPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const client = useQueryClient();
  const { showToast } = useToast(); const orderId = params.get("orderId"); const orderItemId = params.get("orderItemId");
  const [form, setForm] = useState({ reason: "", description: "" }); const [errors, setErrors] = useState({});
  const orderQuery = useQuery({ enabled: Boolean(orderId), queryKey:["customer","order",orderId],
    queryFn: async()=>readOrder(await customerOrderService.getOrder(orderId,{suppressGlobalError:true})) });
  const item = getOrderItems(orderQuery.data || {}).find((value) =>
    String(value.id ?? value.order_item_id ?? value.orderItemId) === String(orderItemId));
  const normalized = item ? normalizeOrderItem(item) : null;
  const policy = item?.warranty_policy || item?.product?.warranty_policy || {};
  const mutation = useMutation({ mutationFn:createWarrantyRequest });
  const submit = async (event) => {
    event.preventDefault(); const reason=form.reason.trim();
    if(!reason){setErrors({reason:"Vui lòng nhập lý do bảo hành."});return;}
    setErrors({});
    try {
      const result=await mutation.mutateAsync({order_id:orderId,order_item_id:orderItemId,reason,description:form.description.trim()||undefined});
      await Promise.all([client.invalidateQueries({queryKey:["customer","orders"]}),client.invalidateQueries({queryKey:["customer","warranty-requests"]})]);
      showToast("Gửi yêu cầu bảo hành thành công","success");
      const id=result?.id||result?.warranty_request_id||result?.data?.id;
      navigate(id?`/account/warranty-requests/${id}`:"/account/warranty-requests");
    } catch(error) { setErrors(getValidationErrors(error)); showToast(getStatusErrorMessage(error,"Không thể gửi yêu cầu bảo hành."),"error"); }
  };
  if(!orderId||!orderItemId) return <main className="container warranty-page"><StatusMessage tone="error">Thiếu thông tin đơn hàng hoặc sản phẩm.</StatusMessage></main>;
  return <main className="container warranty-page"><section className="page-heading"><div><span>Tài khoản</span><h1>Gửi yêu cầu bảo hành</h1></div>
    <Link className="secondary-button" to="/account#orders">Hủy</Link></section>
    <section className="account-panel">{orderQuery.isLoading?<div className="warranty-skeleton"><span className="skeleton-line"/></div>:null}
      {orderQuery.error?<StatusMessage tone="error">{getStatusErrorMessage(orderQuery.error,"Không thể tải đơn hàng.")}</StatusMessage>:null}
      {!orderQuery.isLoading&&!item?<StatusMessage tone="error">Không tìm thấy sản phẩm trong đơn hàng.</StatusMessage>:null}
      {item?<form className="warranty-form" onSubmit={submit}>
        <div className="warranty-product-card">{normalized.image?<img alt={normalized.productName} src={normalized.image}/>:null}<div>
          <span>Đơn hàng #{getOrderCode(orderQuery.data)}</span><h2>{normalized.productName}</h2>
          <p>{policy.name||policy.title||"Chính sách bảo hành theo sản phẩm"}</p>
          <p>{formatWarrantyDate(item.warranty_start_date)} – {formatWarrantyDate(item.warranty_expiry_date||item.warranty_end_date)}</p></div></div>
        <label className="warranty-field"><span>Lý do bảo hành *</span><textarea rows="4" value={form.reason}
          onChange={(e)=>{setForm(x=>({...x,reason:e.target.value}));setErrors(x=>({...x,reason:""}));}}/>
          {getFieldError(errors,"reason")?<small className="field-error">{getFieldError(errors,"reason")}</small>:null}</label>
        <label className="warranty-field"><span>Mô tả chi tiết</span><textarea rows="6" value={form.description}
          onChange={(e)=>setForm(x=>({...x,description:e.target.value}))}/>
          {getFieldError(errors,"description")?<small className="field-error">{getFieldError(errors,"description")}</small>:null}</label>
        <div className="modal-actions"><Link className="secondary-button" to="/account#orders">Hủy</Link>
          <button className="primary-button" disabled={mutation.isPending} type="submit">{mutation.isPending?"Đang gửi...":"Gửi yêu cầu"}</button></div>
      </form>:null}</section></main>;
}
