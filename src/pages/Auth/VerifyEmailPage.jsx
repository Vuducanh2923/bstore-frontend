import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import authApi from "../../services/authApi";
import { getApiErrorMessage } from "../../services/api";
import {
  getEmailError,
  getOtpError,
  normalizeOtpInput,
} from "./authForm";

const RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_MESSAGE = "Nhập mã OTP 6 số được gửi đến email của bạn.";

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const initialEmail = location.state?.email || "";
  const [form, setForm] = useState({
    email: initialEmail,
    otp: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(
    location.state?.message || DEFAULT_MESSAGE,
  );
  const [messageTone, setMessageTone] = useState(
    location.state?.tone || (location.state?.message ? "success" : "info"),
  );
  const [cooldown, setCooldown] = useState(
    location.state?.startCooldown === true ? RESEND_COOLDOWN_SECONDS : 0,
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [cooldown]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "otp" ? normalizeOtpInput(value) : value;

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const validateVerifyForm = () => {
    const email = form.email.trim();
    const nextErrors = {
      email: getEmailError(email),
      otp: getOtpError(form.otp),
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) {
        delete nextErrors[key];
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEmailOnly = () => {
    const email = form.email.trim();
    const emailError = getEmailError(email);

    setErrors((current) => ({
      ...current,
      email: emailError,
    }));

    return !emailError;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateVerifyForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.verifyRegisterOtp({
        email: form.email.trim(),
        otp_code: form.otp,
      });
      showToast("Xác thực email thành công.", "success");
      navigate("/login", {
        replace: true,
        state: {
          message: "Xác thực email thành công. Vui lòng đăng nhập.",
          tone: "success",
        },
      });
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Xác thực email thất bại.");
      setMessage(apiMessage);
      setMessageTone("error");
      showToast(apiMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!validateEmailOnly() || cooldown > 0) {
      return;
    }

    setResending(true);

    try {
      await authApi.resendRegisterOtp({ email: form.email.trim() });
      const successMessage = "Mã xác thực đã được gửi đến email của bạn";
      setMessage(successMessage);
      setMessageTone("success");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(successMessage, "success");
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Không gửi lại được mã OTP.");
      setMessage(apiMessage);
      setMessageTone("error");
      showToast(apiMessage, "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span>Email OTP</span>
        <h1>Xác thực email</h1>
        <p>Hoàn tất bước xác thực để có thể đăng nhập và đặt hàng tại BStore.</p>
        <StatusMessage tone={messageTone}>{message}</StatusMessage>
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
            <FieldError>{errors.email}</FieldError>
          </label>
          <label>
            Mã OTP
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              name="otp"
              onChange={handleChange}
              pattern="\d{6}"
              placeholder="000000"
              required
              type="text"
              value={form.otp}
            />
            <FieldError>{errors.otp}</FieldError>
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Đang xác thực..." : "Xác thực"}
          </button>
        </form>
        <div className="auth-action-row">
          <button
            className="secondary-button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            type="button"
          >
            {cooldown > 0
              ? `Gửi lại mã (${cooldown}s)`
              : resending
                ? "Đang gửi..."
                : "Gửi lại mã"}
          </button>
          <Link className="text-link" to="/login">
            Quay lại đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
