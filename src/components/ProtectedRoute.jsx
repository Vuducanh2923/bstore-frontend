import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRole } from "../utils/formatters";

export default function ProtectedRoute({ children, roles }) {
  const { initialized, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const currentRole = getRole(user);

  if (!initialized) return null;

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (roles?.length && !roles.includes(currentRole)) {
    return <Navigate replace to="/403" />;
  }

  return children;
}
