import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const toPayload = (request) => request.then(unwrapResponse);

function normalizeMessage(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeOtpPayload(payload = {}) {
  const otpCode = payload.otp_code || payload.otp || "";

  return {
    ...payload,
    otp_code: String(otpCode).trim(),
  };
}

function normalizeLoginPayload(payload = {}) {
  return {
    email: String(payload.email || "").trim(),
    password: String(payload.password || ""),
  };
}

const authApi = {
  register: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.register, payload)),
  login: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.login, normalizeLoginPayload(payload))),
  me: () => toPayload(api.get(API_ENDPOINTS.auth.me)),
  verifyRegisterOtp: (payload) =>
    toPayload(
      api.post(API_ENDPOINTS.auth.verifyRegisterOtp, normalizeOtpPayload(payload)),
    ),
  resendRegisterOtp: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.resendRegisterOtp, payload)),
  forgotPassword: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.forgotPassword, payload)),
  verifyForgotPasswordOtp: (payload) =>
    toPayload(
      api.post(
        API_ENDPOINTS.auth.verifyForgotPasswordOtp,
        normalizeOtpPayload(payload),
      ),
    ),
  resetPassword: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.resetPassword, normalizeOtpPayload(payload))),
};

export function isEmailVerificationRequiredError(error) {
  const status = Number(error?.response?.status || 0);
  const message = normalizeMessage(error?.response?.data?.message);

  return (
    status === 403 &&
    (message.includes("xac thuc email") ||
      message.includes("verify email") ||
      message.includes("email_unverified"))
  );
}

export { authApi };
export default authApi;
