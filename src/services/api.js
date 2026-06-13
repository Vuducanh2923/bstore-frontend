import axios from "axios";

export const TOKEN_STORAGE_KEY = "bstore_token";
export const USER_STORAGE_KEY = "bstore_user";
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
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
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("bstore:unauthorized"));
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
    "products",
    "orders",
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
