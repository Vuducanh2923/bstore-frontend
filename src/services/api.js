import axios from "axios";

export const TOKEN_STORAGE_KEY = "bstore_token";
export const USER_STORAGE_KEY = "bstore_user";
export const REFRESH_TOKEN_STORAGE_KEY = "bstore_refresh_token";
export const API_ERROR_EVENT = "bstore:api-error";
export const FORBIDDEN_EVENT = "bstore:forbidden";
export const UNAUTHORIZED_EVENT = "bstore:unauthorized";
export const SESSION_REFRESHED_EVENT = "bstore:session-refreshed";
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const PUBLIC_PATHS = [
  /^\/products(?:\/|$)/, /^\/categories(?:\/|$)/, /^\/brands(?:\/|$)/,
  /^\/banners(?:\/|$)/, /^\/home\/banners(?:\/|$)/,
];
let unauthorizedHandled = false;
let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

export function normalizeToken(value) {
  if (typeof value !== "string") return "";
  let token = value.trim().replace(/^Bearer\s+/i, "").trim();
  while (token.length >= 2 && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1).trim();
  }
  return !token || ["undefined", "null", "[object Object]"].includes(token) ? "" : token;
}

function getCookieValue(name) {
  if (typeof document === "undefined") return "";
  const value = document.cookie.split(";").map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export function getToken() {
  return normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY) || getCookieValue(TOKEN_STORAGE_KEY));
}

export function getRefreshToken() {
  return normalizeToken(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || getCookieValue(REFRESH_TOKEN_STORAGE_KEY));
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY) ||
    getCookieValue(USER_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {
    try { return JSON.parse(decodeURIComponent(raw)); } catch {
      localStorage.removeItem(USER_STORAGE_KEY); sessionStorage.removeItem(USER_STORAGE_KEY); return null;
    }
  }
}

export function setAuthSession(token, user, refreshToken) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) throw new Error("Token xác thực không hợp lệ.");
  localStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (refreshToken !== undefined) {
    const normalizedRefreshToken = normalizeToken(refreshToken);
    if (!normalizedRefreshToken) throw new Error("Refresh token khong hop le.");
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, normalizedRefreshToken);
  }
  unauthorizedHandled = false;
  return normalizedToken;
}

export function clearAuthSession() {
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem(TOKEN_STORAGE_KEY); storage.removeItem(USER_STORAGE_KEY);
    storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  });
  if (typeof document !== "undefined") {
    [TOKEN_STORAGE_KEY, USER_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY].forEach((key) => {
      document.cookie = `${key}=; Max-Age=0; path=/`;
    });
  }
}

function dispatchApiEvent(name, detail = {}) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

function withoutCredentials(value) {
  if (!value || typeof value !== "object") return value;
  const user = { ...value };
  ["access_token", "accessToken", "bearerToken", "expires_in", "refresh_token",
    "refreshToken", "token", "token_type"].forEach((key) => delete user[key]);
  return user;
}

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error("REFRESH_TOKEN_MISSING"));

  refreshPromise = axios.post(`${API_BASE_URL.replace(/\/+$/, "")}/auth/refresh`, {
    refresh_token: refreshToken,
  }, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  }).then((response) => {
    const payload = response?.data?.data ?? response?.data ?? {};
    const nextToken = normalizeToken(payload.token || payload.access_token || payload.accessToken);
    const nextRefreshToken = normalizeToken(payload.refresh_token || payload.refreshToken);

    if (!nextToken || !nextRefreshToken) throw new Error("INVALID_REFRESH_RESPONSE");

    const responseUser = payload.user || payload.account || payload.customer || payload.admin ||
      (payload.id || payload.email ? payload : null);
    const currentUser = withoutCredentials(responseUser) || getStoredUser();
    setAuthSession(nextToken, currentUser, nextRefreshToken);
    dispatchApiEvent(SESSION_REFRESHED_EVENT, { token: nextToken, user: currentUser });
    return nextToken;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function getRequestPath(config = {}) {
  try {
    const url = new URL(config.url || "", config.baseURL || API_BASE_URL);
    return url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  } catch { return String(config.url || ""); }
}

function matches(config, patterns) {
  const path = getRequestPath(config);
  return patterns.some((pattern) => pattern.test(path));
}

function isPublicRequest(config = {}) {
  const method = String(config.method || "get").toLowerCase();
  return ["get", "head", "options"].includes(method) && matches(config, PUBLIC_PATHS);
}

function dispatchHttpError(status, detail = {}) {
  const messages = {
    401: "Phiên đăng nhập đã hết hạn.",
    403: "Bạn không có quyền truy cập.",
    404: "Không tìm thấy dữ liệu yêu cầu.",
    503: "Hệ thống xác thực đang tạm thời không khả dụng.",
  };
  if (messages[status] || status >= 500) dispatchApiEvent(API_ERROR_EVENT, {
    message: messages[status] || "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
    type: status >= 500 ? "error" : "warning",
    dedupeKey: `http-${status}`,
    ...detail,
  });
}

function isEmailVerificationLoginError(error) {
  const message = String(error?.response?.data?.message || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return Number(error?.response?.status) === 403 && getRequestPath(error?.config) === "/auth/login" &&
    (message.includes("xac thuc email") || message.includes("verify email") || message.includes("email_unverified"));
}

api.interceptors.request.use((config) => {
  const token = getToken();
  const isPublic = isPublicRequest(config);
  if (token && !isPublic) config.headers.Authorization = `Bearer ${token}`;
  else if (config.headers) { delete config.headers.Authorization; delete config.headers.authorization; }
  if (import.meta.env.DEV) console.debug("[API request]", { url: getRequestPath(config), hasToken: Boolean(token) });
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.delete === "function") config.headers.delete("Content-Type");
    else { delete config.headers["Content-Type"]; delete config.headers["content-type"]; }
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (import.meta.env.DEV) console.debug("[API response]", {
    url: getRequestPath(response.config), status: response.status, hasToken: Boolean(getToken()),
  });
  return response;
}, async (error) => {
  const status = Number(error.response?.status || 0);
  const config = error.config || {};
  const path = getRequestPath(config);
  const verificationError = isEmailVerificationLoginError(error);
  if (import.meta.env.DEV && !axios.isCancel(error)) console.debug("[API response]", { url: path, status, hasToken: Boolean(getToken()) });
  if (status === 401) {
    if (isPublicRequest(config)) console.warn(`[API] Public endpoint returned 401: ${path}. Session was kept.`);
    else if (path !== "/auth/login" && path !== "/auth/refresh" && !config.skipAuthRefresh && !config._authRetry && getRefreshToken()) {
      config._authRetry = true;
      try {
        const nextToken = await refreshAccessToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${nextToken}`;
        return api(config);
      } catch (refreshError) {
        const refreshStatus = Number(refreshError?.response?.status || 0);
        const invalidResponse = refreshError?.message === "INVALID_REFRESH_RESPONSE";
        if (![400, 401, 403, 422].includes(refreshStatus) && !invalidResponse) {
          if (refreshStatus === 503 && !config.suppressGlobalError) {
            dispatchHttpError(503, { retry: () => api(config) });
          }
          return Promise.reject(refreshError);
        }
      }
    }

    if (!isPublicRequest(config) && path !== "/auth/login" && !unauthorizedHandled) {
      unauthorizedHandled = true; clearAuthSession();
      dispatchApiEvent(UNAUTHORIZED_EVENT, { reason: "session_expired", path });
      if (!config.suppressGlobalError) dispatchHttpError(401);
    }
  } else if (status === 403 && !verificationError) {
    dispatchApiEvent(FORBIDDEN_EVENT, { reason: "forbidden", path });
  }
  if (status && status !== 401 && !verificationError && !config.suppressGlobalError) {
    dispatchHttpError(status, status === 503 ? { retry: () => api(config) } : {});
  }
  return Promise.reject(error);
});

export function unwrapResponse(response) { const body = response?.data; return body?.data ?? body; }
export function readCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of [...keys, "items", "addresses", "customers", "staff", "users", "products", "orders",
    "order_items", "inventories", "inventory", "content", "results", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}
export function normalizePaginatedResponse(responseOrPayload, keys = [], defaults = {}) {
  const responseBody = responseOrPayload?.data !== undefined &&
    (responseOrPayload?.status !== undefined || responseOrPayload?.headers !== undefined)
    ? responseOrPayload.data
    : responseOrPayload;
  const payload = responseBody?.data && !Array.isArray(responseBody.data)
    ? responseBody.data
    : responseBody;
  const data = readCollection(payload, keys);
  const meta = payload?.pagination || payload?.meta || responseBody?.pagination || responseBody?.meta || {};
  const page = Number(meta.current_page ?? meta.currentPage ?? meta.page ?? payload?.current_page ?? payload?.page ?? defaults.page ?? 1);
  const limit = Number(meta.per_page ?? meta.perPage ?? meta.limit ?? payload?.per_page ?? payload?.limit ?? defaults.limit ?? (data.length || 1));
  const total = Number(meta.total ?? payload?.total ?? data.length);
  const totalPages = Number(meta.last_page ?? meta.lastPage ?? meta.total_pages ?? meta.totalPages ?? payload?.last_page ?? payload?.totalPages ?? (Math.ceil(total / Math.max(limit, 1)) || 1));

  return {
    data,
    pagination: {
      page: Math.max(1, page || 1),
      limit: Math.max(1, limit || 1),
      total: Math.max(0, total || 0),
      totalPages: Math.max(1, totalPages || 1),
    },
  };
}
function firstErrorMessage(errors) {
  if (!errors) return "";
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) {
    return errors.map(firstErrorMessage).find(Boolean) || "";
  }
  if (typeof errors === "object") {
    return Object.values(errors).map(firstErrorMessage).find(Boolean) || "";
  }
  return String(errors);
}

export function getApiErrorMessage(error, fallback = "Đã xảy ra lỗi.") {
  if (!error?.response) {
    if (error?.code === "ERR_CANCELED") return "";
    if (error?.code === "ERR_NETWORK" || /network error/i.test(error?.message || "")) {
      return "Không thể kết nối tới máy chủ.";
    }
    return fallback;
  }
  const data = error.response.data;
  if (typeof data === "string") return data;
  return data?.message || firstErrorMessage(data?.errors) || data?.error || fallback;
}

export default api;
