import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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
    setLoading(true);
    setError("");

    try {
      const auth = await login({
        email: form.email,
        username: form.email,
        password: form.password,
      });
      const from = location.state?.from?.pathname || "/";
      const target = auth.user?.role === "admin" ? "/admin" : from;

      showToast("Đăng nhập thành công.", "success");
      navigate(target === "/login" ? "/" : target, { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, "Đăng nhập thất bại.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span>BStore Account</span>
        <h1>Đăng nhập</h1>
        <p>Đăng nhập để mua hàng, quản lý giỏ hàng và theo dõi đơn hàng.</p>
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email hoặc username
            <input
              autoComplete="username"
              name="email"
              onChange={handleChange}
              required
              type="text"
              value={form.email}
            />
          </label>
          <label>
            Mật khẩu
            <input
              autoComplete="current-password"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </section>
    </main>
  );
}
