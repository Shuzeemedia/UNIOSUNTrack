import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  // 🕒 Helper: Schedule auto logout when token expires
  const scheduleLogout = (exp) => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    const now = Date.now();
    const expiryTime = exp * 1000 - now;

    if (expiryTime > 0) {
      logoutTimer.current = setTimeout(() => {
        toast.info("Your session has expired. Please login again.");
        logout(true);
      }, expiryTime);
    }
  };

  // 🚀 Initialize user from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        // 🧠 Token is valid if it expires more than 30s from now
        if (decoded.exp && decoded.exp > now + 30) {
          if (storedUser) setUser(JSON.parse(storedUser));
          scheduleLogout(decoded.exp);
        } else {
          console.warn("Token expired or invalid.");
          logout(); // only clears, doesn’t redirect immediately
        }
      } catch (err) {
        console.error("Auth init error:", err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 🧹 Clean timeout when unmounting
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, []);

  // ✅ Login method — called after successful login
  const login = (userData, token) => {
    if (!userData || !token) return;
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp) scheduleLogout(decoded.exp);
    } catch (err) {
      console.error("Failed to decode token at login:", err);
    }
  };

  // ✅ Logout method — can redirect or just clear session
  const logout = (redirect = false) => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    if (redirect) {
      // ⏱ small delay for toast to show before redirect
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loadingX: loading, // renamed to match your profile usage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
