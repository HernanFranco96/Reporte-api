import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  // No logueado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Rol requerido y no lo tiene
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
