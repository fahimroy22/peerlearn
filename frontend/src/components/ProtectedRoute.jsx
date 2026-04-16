import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  let storedUser = null;

  try {
    const rawUser = localStorage.getItem("user");

    if (rawUser && rawUser !== "undefined" && rawUser !== "null") {
      storedUser = JSON.parse(rawUser);
    }
  } catch (error) {
    console.error("Failed to parse stored user in ProtectedRoute", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;