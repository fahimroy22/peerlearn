import { Navigate } from "react-router-dom";
import useAuth from "../context/useAuth";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  // ⏳ Wait for auth to load
  if (loading) {
    return <div className="empty-state">Checking admin access...</div>;
  }

  // ❌ Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Not admin
  if (!user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // ❌ Blocked admin (extra safety)
  if (user.accountStatus === "blocked") {
    return <Navigate to="/login" replace />;
  }

  // ✅ Admin allowed
  return children;
}

export default AdminRoute;