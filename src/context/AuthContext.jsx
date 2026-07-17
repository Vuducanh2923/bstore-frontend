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
  normalizeToken,
  SESSION_REFRESHED_EVENT,
  setAuthSession,
} from "../services/api";
import authApi from "../services/authApi";
import { getRole } from "../utils/formatters";

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

function withoutCredentials(value) {
  if (!value || typeof value !== "object") return value;
  const user = { ...value };
  ["access_token", "accessToken", "bearerToken", "expires_in", "refresh_token",
    "refreshToken", "token", "token_type"].forEach((key) => delete user[key]);
  return user;
}

function extractAuth(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    data.bearerToken ||
    "";
  const normalizedToken = normalizeToken(token);
  const refreshToken = normalizeToken(data.refresh_token || data.refreshToken || "");
  const decoded = decodeJwt(normalizedToken);
  const user = withoutCredentials(
    data.user ||
    data.account ||
    data.customer ||
    data.admin ||
    (data.id || data.email ? data : null) ||
    decoded ||
    null,
  );

  if (!normalizedToken) {
    throw new Error("API đăng nhập chưa trả về token xác thực.");
  }

  if (!user) {
    throw new Error("API đăng nhập chưa trả về thông tin người dùng.");
  }

  if (!refreshToken) {
    throw new Error("API dang nhap chua tra ve refresh token.");
  }

  return {
    token: normalizedToken,
    refreshToken,
    user,
  };
}

function extractSessionUser(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  return withoutCredentials(data.user || data.account || data.customer || data.admin || data);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getStoredUser());
  const [initialized, setInitialized] = useState(false);

  const clearLocalSession = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getToken()) {
        await authApi.logout();
      }
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => clearLocalSession();
    const handleSessionRefreshed = (event) => {
      setToken(event.detail?.token || getToken());
      setUser(event.detail?.user || getStoredUser());
    };
    window.addEventListener("bstore:unauthorized", handleUnauthorized);
    window.addEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);

    async function restoreSession() {
      const storedToken = getToken();

      if (!storedToken) {
        clearLocalSession();
        if (active) setInitialized(true);
        return;
      }

      try {
        const payload = await authApi.me();
        const sessionUser = extractSessionUser(payload);

        if (!sessionUser || typeof sessionUser !== "object") {
          throw new Error("ThÃ´ng tin phiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡.");
        }

        if (active) {
          const currentToken = getToken();
          setAuthSession(currentToken, sessionUser);
          setToken(currentToken);
          setUser(sessionUser);
        }
      } catch (error) {
        // A confirmed 401 is handled by the API interceptor. Temporary network
        // errors must not sign the user out of an otherwise recoverable session.
        if (Number(error?.response?.status) === 401 && active) {
          clearLocalSession();
        }
      } finally {
        if (active) setInitialized(true);
      }
    }

    restoreSession();
    return () => {
      active = false;
      window.removeEventListener("bstore:unauthorized", handleUnauthorized);
      window.removeEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    };
  }, [clearLocalSession]);

  const login = useCallback(async (credentials) => {
    clearAuthSession();
    setToken(null);
    setUser(null);

    try {
      const payload = await authApi.login(credentials);
      const auth = extractAuth(payload);

      const storedToken = setAuthSession(auth.token, auth.user, auth.refreshToken);
      setToken(storedToken);
      setUser(auth.user);
      return auth;
    } catch (error) {
      clearAuthSession();
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(async (formData) => {
    return authApi.register(formData);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      authLoading: !initialized,
      initialized,
      login,
      logout,
      register,
      role: getRole(user),
      token,
      user,
    }),
    [initialized, login, logout, register, token, user],
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
