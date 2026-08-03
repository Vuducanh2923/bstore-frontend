import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_ERROR_EVENT } from "../services/api";
import { getRole } from "../utils/formatters";

export default function ProtectedRoute({ children, roles }) {
  const { initialized, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const currentRole = getRole(user);
  const forbidden = Boolean(roles?.length && !roles.includes(currentRole));

  useEffect(() => {
    if (!initialized || !isAuthenticated || !forbidden) return;
    window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, {
      detail: {
        dedupeKey: "route-forbidden",
        message: "Bạn không có quyền truy cập.",
        type: "warning",
      },
    }));
  }, [forbidden, initialized, isAuthenticated]);

  if (!initialized) return null;

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (forbidden) {
    return <Navigate replace to={location.pathname.startsWith("/admin") ? "/" : "/403"} />;
  }

  return children;
}
