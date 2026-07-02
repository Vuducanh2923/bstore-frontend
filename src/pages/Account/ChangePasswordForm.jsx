import { useState } from "react";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import { profileService } from "../../services/bstoreService";
import {
  getFieldError,
  getStatusErrorMessage,
  getValidationErrors,
  isValidationError,
} from "../../utils/apiErrors";

const EMPTY_FORM = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
};

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function ChangePasswordForm() {
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setValidationErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setValidationErrors({});

    if (form.new_password !== form.new_password_confirmation) {
      setValidationErrors({
        new_password_confirmation: "Mật khẩu xác nhận không khớp.",
      });
      return;
    }

    setSaving(true);

    try {
      await profileService.changePassword(form);
      setForm(EMPTY_FORM);
      showToast("Đổi mật khẩu thành công.", "success");
    } catch (error) {
      if (isValidationError(error)) {
        setValidationErrors(getValidationErrors(error));
      } else {
        setErrorMessage(getStatusErrorMessage(error, "Không thể đổi mật khẩu."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="account-panel form-stack" onSubmit={handleSubmit}>
      <div className="account-panel-heading">
        <div>
          <h2>Đổi mật khẩu</h2>
          <p>Dùng mật khẩu mạnh và không chia sẻ với người khác.</p>
        </div>
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      <label>
        Mật khẩu hiện tại
        <input
          autoComplete="current-password"
          name="current_password"
          onChange={handleChange}
          type="password"
          value={form.current_password}
        />
        <FieldError>{getFieldError(validationErrors, "current_password")}</FieldError>
      </label>
      <label>
        Mật khẩu mới
        <input
          autoComplete="new-password"
          name="new_password"
          onChange={handleChange}
          type="password"
          value={form.new_password}
        />
        <FieldError>{getFieldError(validationErrors, "new_password")}</FieldError>
      </label>
      <label>
        Xác nhận mật khẩu mới
        <input
          autoComplete="new-password"
          name="new_password_confirmation"
          onChange={handleChange}
          type="password"
          value={form.new_password_confirmation}
        />
        <FieldError>
          {getFieldError(validationErrors, "new_password_confirmation")}
        </FieldError>
      </label>
    </form>
  );
}
