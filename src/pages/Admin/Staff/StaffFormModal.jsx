import { useMemo, useState } from "react";
import StatusMessage from "../../../components/StatusMessage";
import { getFieldError } from "../../../utils/apiErrors";

const EMPTY_STAFF_FORM = {
  email: "",
  full_name: "",
  password: "",
  password_confirmation: "",
  phone: "",
  status: "active",
};

function createStaffForm(staff = {}) {
  return {
    email: staff.email || "",
    full_name: staff.full_name || staff.fullName || staff.name || "",
    password: "",
    password_confirmation: "",
    phone: staff.phone || "",
    status: staff.status || "active",
  };
}

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function StaffFormModal({
  errorMessage,
  onClose,
  onSubmit,
  saving,
  staff,
  validationErrors = {},
}) {
  const isEditing = Boolean(staff?.id);
  const [form, setForm] = useState(() => createStaffForm(staff || EMPTY_STAFF_FORM));
  const [localErrors, setLocalErrors] = useState({});

  const mergedErrors = useMemo(
    () => ({
      ...validationErrors,
      ...localErrors,
    }),
    [localErrors, validationErrors],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setLocalErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (form.password || form.password_confirmation) {
      if (form.password !== form.password_confirmation) {
        setLocalErrors({
          password_confirmation: "Mật khẩu xác nhận không khớp.",
        });
        return;
      }
    }

    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="account-modal admin-staff-modal" role="dialog">
        <div className="modal-heading">
          <div>
            <h2>{isEditing ? "Sửa staff" : "Thêm staff"}</h2>
            <p>{isEditing ? "Cập nhật thông tin nhân viên." : "Tạo tài khoản staff mới."}</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <StatusMessage tone="error">{errorMessage}</StatusMessage>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="account-form-grid">
            <label>
              Họ tên
              <input name="full_name" onChange={handleChange} value={form.full_name} />
              <FieldError>{getFieldError(mergedErrors, "full_name")}</FieldError>
            </label>
            <label>
              Email
              <input name="email" onChange={handleChange} type="email" value={form.email} />
              <FieldError>{getFieldError(mergedErrors, "email")}</FieldError>
            </label>
            <label>
              Số điện thoại
              <input name="phone" onChange={handleChange} value={form.phone} />
              <FieldError>{getFieldError(mergedErrors, "phone")}</FieldError>
            </label>
            <label>
              Trạng thái
              <select name="status" onChange={handleChange} value={form.status}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="blocked">blocked</option>
              </select>
              <FieldError>{getFieldError(mergedErrors, "status")}</FieldError>
            </label>
            <label>
              {isEditing ? "Mật khẩu mới" : "Mật khẩu"}
              <input
                autoComplete="new-password"
                name="password"
                onChange={handleChange}
                type="password"
                value={form.password}
              />
              <FieldError>{getFieldError(mergedErrors, "password")}</FieldError>
            </label>
            <label>
              Xác nhận mật khẩu
              <input
                autoComplete="new-password"
                name="password_confirmation"
                onChange={handleChange}
                type="password"
                value={form.password_confirmation}
              />
              <FieldError>
                {getFieldError(mergedErrors, "password_confirmation")}
              </FieldError>
            </label>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Hủy
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Đang lưu..." : "Lưu staff"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
