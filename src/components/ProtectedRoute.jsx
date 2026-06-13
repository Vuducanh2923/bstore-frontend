import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/formatters";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (roles?.length && !roles.includes(normalizeRole(role))) {
    return <Navigate replace to="/" />;
  }

  return children;
}
