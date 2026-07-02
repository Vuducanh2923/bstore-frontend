export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const OTP_PATTERN = /^\d{6}$/;

export function normalizeOtpInput(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);
}

export function getEmailError(email) {
  if (!email) {
    return "Vui lòng nhập email.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Email không đúng định dạng.";
  }

  return "";
}

export function getOtpError(otp) {
  if (!OTP_PATTERN.test(otp)) {
    return "OTP phải gồm đúng 6 số.";
  }

  return "";
}

export function getPasswordError(password) {
  if (String(password || "").length < 8) {
    return "Mật khẩu tối thiểu 8 ký tự.";
  }

  return "";
}

export function getPasswordConfirmationError(password, confirmation) {
  if (password !== confirmation) {
    return "Xác nhận mật khẩu phải trùng.";
  }

  return "";
}
