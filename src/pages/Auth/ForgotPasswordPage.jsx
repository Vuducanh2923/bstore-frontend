import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import authApi from "../../services/authApi";
import { getApiErrorMessage } from "../../services/api";
import {
  getEmailError,
  getOtpError,
  getPasswordConfirmationError,
  getPasswordError,
  normalizeOtpInput,
} from "./authForm";

const RESEND_COOLDOWN_SECONDS = 60;
const FORGOT_PASSWORD_OTP_SENT_MESSAGE =
  "Mã OTP đã được gửi đến email của bạn";
const INVALID_OTP_MESSAGE =
  "OTP sai hoặc đã hết hạn. Vui lòng kiểm tra lại mã OTP.";

const STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "OTP" },
  { id: 3, label: "Mật khẩu" },
];

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

function normalizeMessage(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isOtpErrorMessage(message) {
  const normalized = normalizeMessage(message);

  return (
    normalized.includes("otp") &&
    (normalized.includes("khong hop le") ||
      normalized.includes("het han") ||
      normalized.includes("invalid") ||
      normalized.includes("expired"))
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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

  const submitEmail = async () => {
    const email = form.email.trim();
    const emailError = getEmailError(email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setMessage(FORGOT_PASSWORD_OTP_SENT_MESSAGE);
      setMessageTone("success");
      setStep(2);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(FORGOT_PASSWORD_OTP_SENT_MESSAGE, "success");
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Không gửi được mã OTP.");
      setMessage(apiMessage);
      setMessageTone("error");
      showToast(apiMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    const otpError = getOtpError(form.otp);

    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }

    setMessage("");
    setStep(3);
  };

  const submitPassword = async () => {
    const passwordError = getPasswordError(form.password);
    const confirmationError = getPasswordConfirmationError(
      form.password,
      form.password_confirmation,
    );
    const nextErrors = {
      password: passwordError,
      password_confirmation: confirmationError,
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) {
        delete nextErrors[key];
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        email: form.email.trim(),
        otp_code: form.otp,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      showToast("Đặt lại mật khẩu thành công.", "success");
      navigate("/login", {
        replace: true,
        state: {
          message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.",
          tone: "success",
        },
      });
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Đặt lại mật khẩu thất bại.");
      const message = isOtpErrorMessage(apiMessage)
        ? INVALID_OTP_MESSAGE
        : apiMessage;

      if (isOtpErrorMessage(apiMessage)) {
        setErrors({ otp: INVALID_OTP_MESSAGE });
        setStep(2);
      }

      setMessage(message);
      setMessageTone("error");
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (step === 1) {
      await submitEmail();
      return;
    }

    if (step === 2) {
      await submitOtp();
      return;
    }

    await submitPassword();
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) {
      return;
    }

    const email = form.email.trim();
    const emailError = getEmailError(email);

    if (emailError) {
      setErrors({ email: emailError });
      setStep(1);
      return;
    }

    setResending(true);

    try {
      await authApi.forgotPassword({ email });
      setMessage(FORGOT_PASSWORD_OTP_SENT_MESSAGE);
      setMessageTone("success");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(FORGOT_PASSWORD_OTP_SENT_MESSAGE, "success");
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
      <section className="auth-card auth-card--wide">
        <span>BStore Account</span>
        <h1>Quên mật khẩu</h1>
        <p>Đặt lại mật khẩu tài khoản bằng mã OTP được gửi qua email.</p>
        <div className="auth-steps" aria-label="Tiến trình đặt lại mật khẩu">
          {STEPS.map((item) => (
            <span
              className={item.id <= step ? "active" : ""}
              key={item.id}
            >
              {item.id}. {item.label}
            </span>
          ))}
        </div>
        {message ? <StatusMessage tone={messageTone}>{message}</StatusMessage> : null}
        <form className="form-stack" onSubmit={handleSubmit}>
          {step === 1 ? (
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
          ) : null}

          {step === 2 ? (
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
          ) : null}

          {step === 3 ? (
            <>
              <label>
                Mật khẩu mới
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="password"
                  onChange={handleChange}
                  required
                  type="password"
                  value={form.password}
                />
                <FieldError>{errors.password}</FieldError>
              </label>
              <label>
                Xác nhận mật khẩu
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="password_confirmation"
                  onChange={handleChange}
                  required
                  type="password"
                  value={form.password_confirmation}
                />
                <FieldError>{errors.password_confirmation}</FieldError>
              </label>
            </>
          ) : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading
              ? "Đang xử lý..."
              : step === 1
                ? "Gửi mã OTP"
                : step === 2
                  ? "Tiếp tục"
                  : "Đặt lại mật khẩu"}
          </button>
        </form>

        {step === 2 ? (
          <div className="auth-action-row">
            <button
              className="secondary-button"
              disabled={cooldown > 0 || resending}
              onClick={handleResendOtp}
              type="button"
            >
              {cooldown > 0
                ? `Gửi lại mã (${cooldown}s)`
                : resending
                  ? "Đang gửi..."
                  : "Gửi lại mã"}
            </button>
          </div>
        ) : null}

        <p className="auth-switch">
          Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
