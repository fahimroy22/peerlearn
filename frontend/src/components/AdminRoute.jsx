import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  let storedUser = null;

  try {
    const rawUser = localStorage.getItem("user");

    if (rawUser && rawUser !== "undefined" && rawUser !== "null") {
      storedUser = JSON.parse(rawUser);
    }
  } catch (error) {
    console.error("Failed to parse stored user in AdminRoute", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  if (!storedUser.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;