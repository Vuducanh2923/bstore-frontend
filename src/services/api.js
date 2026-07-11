import axios from "axios";

export const TOKEN_STORAGE_KEY = "bstore_token";
export const USER_STORAGE_KEY = "bstore_user";
export const API_ERROR_EVENT = "bstore:api-error";
export const FORBIDDEN_EVENT = "bstore:forbidden";
export const UNAUTHORIZED_EVENT = "bstore:unauthorized";
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const AUTH_REQUIRED_PATHS = [
  /^\/admin(?:\/|$)/,
  /^\/cart-items(?:\/|$)/,
  /^\/carts(?:\/|$)/,
  /^\/customer(?:\/|$)/,
  /^\/orders(?:\/|$)/,
  /^\/payments(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/users(?:\/|$)/,
];

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function getToken() {
  const token =
    localStorage.getItem(TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
    getCookieValue(TOKEN_STORAGE_KEY);

  if (isExpiredJwt(token)) {
    clearAuthSession();
    return null;
  }

  return token;
}

function getCookieValue(name) {
  if (typeof document === "undefined") {
    return "";
  }

  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isExpiredJwt(token) {
  if (!token?.includes(".")) {
    return false;
  }

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const expiresAt = Number(payload.exp || 0);

    return expiresAt > 0 && expiresAt <= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getStoredUser() {
  const rawUser =
    localStorage.getItem(USER_STORAGE_KEY) ||
    sessionStorage.getItem(USER_STORAGE_KEY) ||
    getCookieValue(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(rawUser));
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }
}

export function setAuthSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);

  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_STORAGE_KEY}=; Max-Age=0; path=/`;
    document.cookie = `${USER_STORAGE_KEY}=; Max-Age=0; path=/`;
  }
}

function dispatchApiEvent(name, detail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getRequestPath(config = {}) {
  try {
    const url = new URL(config.url || "", config.baseURL || API_BASE_URL);
    return url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  } catch {
    return String(config.url || "");
  }
}

function requiresAuth(config = {}) {
  const path = getRequestPath(config);

  return AUTH_REQUIRED_PATHS.some((pattern) => pattern.test(path));
}

function dispatchHttpError(status) {
  if (status === 401) {
    dispatchApiEvent(API_ERROR_EVENT, {
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      type: "warning",
    });
    return;
  }

  if (status === 403) {
    dispatchApiEvent(API_ERROR_EVENT, {
      message: "Bạn không có quyền thực hiện thao tác này.",
      type: "warning",
    });
    return;
  }

  if (status === 404) {
    dispatchApiEvent(API_ERROR_EVENT, {
      message: "Không tìm thấy dữ liệu yêu cầu.",
      type: "warning",
    });
    return;
  }

  if (status >= 500) {
    dispatchApiEvent(API_ERROR_EVENT, {
      message: "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
      type: "error",
    });
  }
}

function normalizeErrorMessage(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isEmailVerificationLoginError(error) {
  const status = Number(error?.response?.status || 0);
  const path = getRequestPath(error?.config);
  const message = normalizeErrorMessage(error?.response?.data?.message);

  return (
    status === 403 &&
    path === "/auth/login" &&
    (message.includes("xac thuc email") ||
      message.includes("verify email") ||
      message.includes("email_unverified"))
  );
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (requiresAuth(config)) {
    const error = new Error("AUTH_REQUIRED");
    error.code = "AUTH_REQUIRED";
    dispatchApiEvent(UNAUTHORIZED_EVENT, { reason: "missing_token" });
    dispatchApiEvent(API_ERROR_EVENT, {
      message: "Vui lòng đăng nhập để tiếp tục.",
      type: "warning",
    });
    return Promise.reject(error);
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error.response?.status || 0);
    const isLoginVerificationError = isEmailVerificationLoginError(error);

    if (status === 401) {
      clearAuthSession();
      dispatchApiEvent(UNAUTHORIZED_EVENT, { reason: "unauthorized" });
    } else if (status === 403 && !isLoginVerificationError) {
      dispatchApiEvent(FORBIDDEN_EVENT, { reason: "forbidden" });
    }

    if (status && !isLoginVerificationError && !error.config?.suppressGlobalError) {
      dispatchHttpError(status);
    }

    return Promise.reject(error);
  },
);

export function unwrapResponse(response) {
  const body = response?.data;
  return body?.data ?? body;
}

export function readCollection(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const preferredKeys = [
    ...keys,
    "items",
    "addresses",
    "customers",
    "staff",
    "users",
    "products",
    "orders",
    "order_items",
    "inventories",
    "inventory",
    "content",
    "results",
    "data",
  ];

  for (const key of preferredKeys) {
    const value = payload?.[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function getApiErrorMessage(error, fallback = "Không thể kết nối API.") {
  if (!error?.response) {
    return fallback;
  }

  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  const validationMessages = data?.errors
    ? Object.values(data.errors).flat().filter(Boolean)
    : [];

  return (
    data?.message ||
    validationMessages[0] ||
    data?.error ||
    error?.message ||
    fallback
  );
}

export default api;
