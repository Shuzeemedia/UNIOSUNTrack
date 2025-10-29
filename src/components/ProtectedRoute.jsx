import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Wait until AuthContext finishes loading
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          fontWeight: "500",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  // Redirect to login if not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role?.toLowerCase();
  const path = location.pathname.toLowerCase();

  // Allow profile or account-settings for all authenticated users
  if (path.includes("/profile") || path.includes("/account-settings")) {
    return children;
  }

  // Allow if no specific restriction
  if (allowedRoles.length === 0) {
    return children;
  }

  // Block unauthorized roles
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

export default ProtectedRoute;
