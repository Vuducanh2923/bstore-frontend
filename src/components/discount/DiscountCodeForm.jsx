import { useState } from "react";
import { getFieldError } from "../../utils/apiErrors";

const initial={code:"",name:"",description:"",type:"percentage",value:"",max_discount_amount:"",
  min_order_amount:"",usage_limit:"",per_customer_limit:"",start_at:"",end_at:"",status:"active"};
export default function DiscountCodeForm({errors={},pending,onCancel,onSubmit}) {
  const [form,setForm]=useState(initial); const [localErrors,setLocalErrors]=useState({});
  const change=(e)=>{let value=e.target.value;if(e.target.name==="code")value=value.toUpperCase().replace(/\s/g,"");
    setForm(x=>({...x,[e.target.name]:value,...(e.target.name==="type"&&value==="fixed_amount"?{max_discount_amount:""}:{})}));
    setLocalErrors(x=>({...x,[e.target.name]:""}));};
  const submit=(e)=>{e.preventDefault();const next={};
    if(!form.code)next.code="Vui lòng nhập mã giảm giá.";if(!form.name.trim())next.name="Vui lòng nhập tên chương trình.";
    if(!(Number(form.value)>0))next.value="Giá trị giảm phải lớn hơn 0.";
    if(form.type==="percentage"&&Number(form.value)>100)next.value="Phần trăm giảm không được vượt quá 100.";
    if(!form.start_at)next.start_at="Vui lòng chọn thời gian bắt đầu.";if(!form.end_at)next.end_at="Vui lòng chọn thời gian kết thúc.";
    if(form.start_at&&form.end_at&&new Date(form.end_at)<=new Date(form.start_at))next.end_at="Thời gian kết thúc phải sau thời gian bắt đầu.";
    setLocalErrors(next);if(Object.keys(next).length)return;
    const numeric=["value","max_discount_amount","min_order_amount","usage_limit","per_customer_limit"];
    const backendFields={
      type:"discount_type",
      value:"discount_value",
      per_customer_limit:"usage_limit_per_customer",
      start_at:"starts_at",
      end_at:"ends_at",
    };
    const payload=Object.fromEntries(Object.entries(form).map(([k,v])=>[
      backendFields[k]||k,
      numeric.includes(k)&&v!==""?Number(v):v||null,
    ]));
    onSubmit(payload);
  };
  const error=(name)=>localErrors[name]||getFieldError(errors,name);
  return <form className="discount-form" onSubmit={submit}>
    <div className="discount-form-grid">
      <label><span>Mã giảm giá *</span><input name="code" value={form.code} onChange={change}/>{error("code")?<small className="field-error">{error("code")}</small>:null}</label>
      <label><span>Tên chương trình *</span><input name="name" value={form.name} onChange={change}/>{error("name")?<small className="field-error">{error("name")}</small>:null}</label>
      <label className="discount-full"><span>Mô tả</span><textarea name="description" rows="4" value={form.description} onChange={change}/>{error("description")?<small className="field-error">{error("description")}</small>:null}</label>
      <label><span>Loại giảm *</span><select name="type" value={form.type} onChange={change}><option value="percentage">Giảm theo phần trăm</option><option value="fixed_amount">Giảm số tiền cố định</option></select>
        {error("discount_type")||error("type")?<small className="field-error">{error("discount_type")||error("type")}</small>:null}</label>
      <label><span>Giá trị giảm * {form.type==="percentage"?"(%)":"(VNĐ)"}</span><input min="0" max={form.type==="percentage"?100:undefined} name="value" type="number" value={form.value} onChange={change}/>{error("discount_value")||error("value")?<small className="field-error">{error("discount_value")||error("value")}</small>:null}</label>
      {form.type==="percentage"?<label><span>Mức giảm tối đa (VNĐ)</span><input min="0" name="max_discount_amount" type="number" value={form.max_discount_amount} onChange={change}/>{error("max_discount_amount")?<small className="field-error">{error("max_discount_amount")}</small>:null}</label>:null}
      <label><span>Đơn hàng tối thiểu (VNĐ)</span><input min="0" name="min_order_amount" type="number" value={form.min_order_amount} onChange={change}/>{error("min_order_amount")?<small className="field-error">{error("min_order_amount")}</small>:null}</label>
      <label><span>Tổng lượt sử dụng tối đa</span><input min="1" name="usage_limit" type="number" value={form.usage_limit} onChange={change}/>{error("usage_limit")?<small className="field-error">{error("usage_limit")}</small>:null}</label>
      <label><span>Lượt tối đa mỗi khách hàng</span><input min="1" name="per_customer_limit" type="number" value={form.per_customer_limit} onChange={change}/>{error("usage_limit_per_customer")||error("per_customer_limit")?<small className="field-error">{error("usage_limit_per_customer")||error("per_customer_limit")}</small>:null}</label>
      <label><span>Bắt đầu *</span><input name="start_at" type="datetime-local" value={form.start_at} onChange={change}/>{error("starts_at")||error("start_at")?<small className="field-error">{error("starts_at")||error("start_at")}</small>:null}</label>
      <label><span>Kết thúc *</span><input name="end_at" type="datetime-local" value={form.end_at} onChange={change}/>{error("ends_at")||error("end_at")?<small className="field-error">{error("ends_at")||error("end_at")}</small>:null}</label>
      <label><span>Trạng thái</span><select name="status" value={form.status} onChange={change}><option value="active">Đang áp dụng</option><option value="inactive">Ngừng áp dụng</option></select></label>
    </div><div className="modal-actions"><button disabled={pending} onClick={onCancel} type="button">Hủy</button>
      <button className="primary-button" disabled={pending} type="submit">{pending?"Đang lưu...":"Lưu mã giảm giá"}</button></div>
  </form>;
}
