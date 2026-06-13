import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.fullName,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      showToast("Đăng ký thành công. Vui lòng đăng nhập.", "success");
      navigate("/login");
    } catch (err) {
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
              name="fullName"
              onChange={handleChange}
              required
              value={form.fullName}
            />
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
          </label>
          <label>
            Số điện thoại
            <input
              autoComplete="tel"
              name="phone"
              onChange={handleChange}
              value={form.phone}
            />
          </label>
          <label>
            Mật khẩu
            <input
              autoComplete="new-password"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>
          <label>
            Nhập lại mật khẩu
            <input
              autoComplete="new-password"
              name="confirmPassword"
              onChange={handleChange}
              required
              type="password"
              value={form.confirmPassword}
            />
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
