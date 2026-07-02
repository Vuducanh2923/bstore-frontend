import { useState } from "react";
import StatusMessage from "../../components/StatusMessage";
import { getFieldError } from "../../utils/apiErrors";

const EMPTY_ADDRESS = {
  address: "",
  district: "",
  is_default: false,
  province: "",
  receiver_name: "",
  receiver_phone: "",
  ward: "",
};

function createAddressForm(address = {}) {
  return {
    address: address.address || "",
    district: address.district || "",
    is_default: Boolean(address.is_default ?? address.isDefault),
    province: address.province || "",
    receiver_name: address.receiver_name || address.receiverName || "",
    receiver_phone: address.receiver_phone || address.receiverPhone || "",
    ward: address.ward || "",
  };
}

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function AddressFormModal({
  address,
  errorMessage,
  onClose,
  onSubmit,
  saving,
  validationErrors = {},
}) {
  const [form, setForm] = useState(() => createAddressForm(address || EMPTY_ADDRESS));

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="account-modal form-stack" role="dialog">
        <div className="modal-heading">
          <div>
            <h2>{address?.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h2>
            <p>Thông tin này được dùng cho giao hàng.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <StatusMessage tone="error">{errorMessage}</StatusMessage>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="account-form-grid">
            <label>
              Người nhận
              <input
                name="receiver_name"
                onChange={handleChange}
                value={form.receiver_name}
              />
              <FieldError>{getFieldError(validationErrors, "receiver_name")}</FieldError>
            </label>
            <label>
              Số điện thoại
              <input
                name="receiver_phone"
                onChange={handleChange}
                value={form.receiver_phone}
              />
              <FieldError>{getFieldError(validationErrors, "receiver_phone")}</FieldError>
            </label>
            <label>
              Tỉnh/Thành phố
              <input name="province" onChange={handleChange} value={form.province} />
              <FieldError>{getFieldError(validationErrors, "province")}</FieldError>
            </label>
            <label>
              Quận/Huyện
              <input name="district" onChange={handleChange} value={form.district} />
              <FieldError>{getFieldError(validationErrors, "district")}</FieldError>
            </label>
            <label>
              Phường/Xã
              <input name="ward" onChange={handleChange} value={form.ward} />
              <FieldError>{getFieldError(validationErrors, "ward")}</FieldError>
            </label>
          </div>
          <label>
            Địa chỉ
            <textarea name="address" onChange={handleChange} rows="3" value={form.address} />
            <FieldError>{getFieldError(validationErrors, "address")}</FieldError>
          </label>
          <label className="checkbox-field">
            <input
              checked={form.is_default}
              name="is_default"
              onChange={handleChange}
              type="checkbox"
            />
            Đặt làm địa chỉ mặc định
          </label>
          <FieldError>{getFieldError(validationErrors, "is_default")}</FieldError>

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Hủy
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Đang lưu..." : "Lưu địa chỉ"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
