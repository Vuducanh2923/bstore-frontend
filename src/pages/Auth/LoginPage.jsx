import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import authApi, {
  isEmailVerificationRequiredError,
} from "../../services/authApi";
import { getRole, USER_ROLES } from "../../utils/formatters";
import { getEmailError } from "./authForm";

const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const flashMessage = notice || location.state?.message || "";
  const flashTone = notice ? "success" : location.state?.tone || "success";

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [resendCooldown]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "email") {
      setVerificationEmail("");
      setResendCooldown(0);
      setNotice("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setVerificationEmail("");

    try {
      const auth = await login({
        email: form.email.trim(),
        password: form.password,
      });
      const from = location.state?.from?.pathname || "/";
      const signedInRole = getRole(auth.user);
      const target = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(signedInRole)
        ? "/admin"
        : from;

      showToast("Đăng nhập thành công.", "success");
      navigate(target === "/login" ? "/" : target, { replace: true });
    } catch (err) {
      if (isEmailVerificationRequiredError(err)) {
        const message =
          "Tài khoản chưa xác thực email. Vui lòng kiểm tra email để nhập mã OTP.";
        setError(message);
        setVerificationEmail(form.email.trim());
        showToast(message, "warning");
        return;
      }

      const message = getApiErrorMessage(err, "Đăng nhập thất bại.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const email = verificationEmail || form.email.trim();
    const emailError = getEmailError(email);

    if (emailError || resendCooldown > 0) {
      setError(emailError || "Vui lòng chờ trước khi gửi lại mã OTP.");
      return;
    }

    setResending(true);

    try {
      await authApi.resendRegisterOtp({ email });
      const successMessage = "Mã xác thực đã được gửi đến email của bạn";
      setVerificationEmail(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setError("");
      setNotice(successMessage);
      showToast(successMessage, "success");
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Không gửi lại được mã OTP.");
      setError(apiMessage);
      showToast(apiMessage, "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span>BStore Account</span>
        <h1>Đăng nhập</h1>
        <p>Đăng nhập để mua hàng, quản lý giỏ hàng và theo dõi đơn hàng.</p>
        {flashMessage ? (
          <StatusMessage tone={flashTone}>{flashMessage}</StatusMessage>
        ) : null}
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        <form className="form-stack" onSubmit={handleSubmit}>
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
        {verificationEmail ? (
          <div className="auth-action-row auth-action-row--stacked">
            <Link
              className="secondary-button"
              state={{
                email: verificationEmail,
                message:
                  "Tài khoản chưa xác thực email. Vui lòng nhập mã OTP hoặc gửi lại mã.",
                tone: "warning",
                startCooldown: false,
              }}
              to="/verify-email"
            >
              Nhập OTP
            </Link>
            <button
              className="secondary-button"
              disabled={resendCooldown > 0 || resending}
              onClick={handleResendOtp}
              type="button"
            >
              {resendCooldown > 0
                ? `Gửi lại OTP (${resendCooldown}s)`
                : resending
                  ? "Đang gửi..."
                  : "Gửi lại OTP"}
            </button>
          </div>
        ) : null}
        <p className="auth-switch">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </p>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </section>
    </main>
  );
}
