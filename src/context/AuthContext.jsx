/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuthSession,
  getStoredUser,
  getToken,
  setAuthSession,
} from "../services/api";
import { authService } from "../services/bstoreService";
import { getUserRole, normalizeRole } from "../utils/formatters";

const AuthContext = createContext(null);

function decodeJwt(token) {
  if (!token?.includes(".")) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function extractAuth(payload) {
  const data = payload?.data ?? payload ?? {};
  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    data.bearerToken ||
    "";
  const decoded = decodeJwt(token);
  const user =
    data.user ||
    data.account ||
    data.customer ||
    data.admin ||
    (data.id || data.email ? data : null) ||
    decoded ||
    null;

  if (!user) {
    throw new Error("API đăng nhập chưa trả về thông tin người dùng.");
  }

  return {
    token,
    user: {
      ...user,
      role: getUserRole(user),
    },
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getStoredUser());

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("bstore:unauthorized", logout);
    return () => window.removeEventListener("bstore:unauthorized", logout);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const payload = await authService.login(credentials);
    const auth = extractAuth(payload);

    setAuthSession(auth.token, auth.user);
    setToken(auth.token || null);
    setUser(auth.user);
    return auth;
  }, []);

  const register = useCallback(async (formData) => {
    return authService.register(formData);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user || token),
      login,
      logout,
      register,
      role: normalizeRole(user?.role || user?.role_id),
      token,
      user,
    }),
    [login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
