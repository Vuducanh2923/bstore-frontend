import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import {
  getFieldError,
  getValidationErrors,
  isValidationError,
} from "../../utils/apiErrors";

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    password_confirmation: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
    setValidationErrors({});

    if (form.password !== form.password_confirmation) {
      setValidationErrors({
        password_confirmation: "Mật khẩu xác nhận không khớp.",
      });
      return;
    }

    setLoading(true);

    try {
      await register({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        phone: form.phone.trim(),
      });
      const successMessage = "Mã xác thực đã được gửi đến email của bạn";
      showToast(successMessage, "success");
      navigate("/verify-email", {
        state: {
          email: form.email.trim(),
          message: successMessage,
          tone: "success",
          startCooldown: true,
        },
      });
    } catch (err) {
      if (isValidationError(err)) {
        const errors = getValidationErrors(err);
        const message =
          errors.email ||
          errors.phone ||
          errors.full_name ||
          getApiErrorMessage(err, "Dữ liệu đăng ký không hợp lệ.");

        setValidationErrors(errors);
        setError(message);
        showToast(message, "error");
        return;
      }

      const message = getApiErrorMessage(err, "Đăng ký thất bại.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span>Join BStore</span>
        <h1>Đăng ký</h1>
        <p>Tạo tài khoản customer để đặt hàng và thanh toán COD/Online.</p>
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Họ tên
            <input
              autoComplete="name"
              name="full_name"
              onChange={handleChange}
              required
              value={form.full_name}
            />
            <FieldError>{getFieldError(validationErrors, "full_name")}</FieldError>
          </label>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              required
              type="email"
              value={form.email}
            />
            <FieldError>{getFieldError(validationErrors, "email")}</FieldError>
          </label>
          <label>
            Số điện thoại
            <input
              autoComplete="tel"
              name="phone"
              onChange={handleChange}
              value={form.phone}
            />
            <FieldError>{getFieldError(validationErrors, "phone")}</FieldError>
          </label>
          <label>
            Mật khẩu
            <input
              autoComplete="new-password"
              minLength={6}
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
            <FieldError>{getFieldError(validationErrors, "password")}</FieldError>
          </label>
          <label>
            Nhập lại mật khẩu
            <input
              autoComplete="new-password"
              minLength={6}
              name="password_confirmation"
              onChange={handleChange}
              required
              type="password"
              value={form.password_confirmation}
            />
            <FieldError>
              {getFieldError(validationErrors, "password_confirmation")}
            </FieldError>
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
          </button>
        </form>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
