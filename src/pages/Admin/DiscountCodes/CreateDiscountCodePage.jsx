import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DiscountCodeForm from "../../../components/discount/DiscountCodeForm";
import { useToast } from "../../../context/ToastContext";
import { useDiscountMutation } from "../../../hooks/useDiscountCodes";
import { createDiscountCode } from "../../../services/discountCodeApi";
import { getStatusErrorMessage, getValidationErrors } from "../../../utils/apiErrors";

export default function CreateDiscountCodePage(){
  const navigate=useNavigate();const {showToast}=useToast();const [errors,setErrors]=useState({});
  const mutation=useDiscountMutation(createDiscountCode);
  const submit=async(payload)=>{setErrors({});try{await mutation.mutateAsync(payload);showToast("Thêm mã giảm giá thành công","success");navigate("/admin/discount-codes");}
    catch(e){const next=getValidationErrors(e);if(Number(e?.response?.status)===409)next.code="Mã giảm giá đã tồn tại";setErrors(next);showToast(getStatusErrorMessage(e,"Không thể thêm mã giảm giá."),"error");}};
  return <section className="admin-page discount-admin-page"><div className="admin-page-heading"><div><span>Khuyến mãi</span><h1>Thêm mã giảm giá</h1></div></div>
    <div className="admin-card"><DiscountCodeForm errors={errors} pending={mutation.isPending} onCancel={()=>navigate("/admin/discount-codes")} onSubmit={submit}/></div></section>;
}
