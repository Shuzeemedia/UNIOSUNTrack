import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  // Schedule auto logout when token is about to expire
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

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (token) {
          const decoded = jwtDecode(token);
          const now = Date.now() / 1000;

          if (decoded.exp && decoded.exp > now) {
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            }
            scheduleLogout(decoded.exp);
          } else {
            logout();
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
        logout();
      } finally {
        setLoading(false); // Always end loading, even if error
      }
    };

    initAuth();

    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, []);

  // Login and store user/token
  const login = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp) scheduleLogout(decoded.exp);
    } catch {
      console.warn("Token decode failed during login.");
    }
  };

  // Logout and optionally redirect
  const logout = (redirect = false) => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);

    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    if (redirect) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
