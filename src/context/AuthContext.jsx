import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  // Helper: Schedule auto logout when token expires
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

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to refresh user");

      const data = await res.json();

      const normalized = {
        ...data.user,
        id: data.user.id || data.user._id,
      };

      if (normalized.department) {
        normalized.department = {
          ...normalized.department,
          id: normalized.department.id || normalized.department._id,
        };
        delete normalized.department._id;
      }

      delete normalized._id;

      setUser(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));
    } catch (err) {
      console.error("User refresh failed:", err);
    }
  };


  // Initialize user from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!token || !storedUser) {
        setLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (!decoded.exp || decoded.exp > now) {
          const parsedUser = JSON.parse(storedUser);

          // ✅ Normalize here
          const normalized = { ...parsedUser, id: parsedUser.id || parsedUser._id };
          if (normalized.department) {
            normalized.department = {
              ...normalized.department,
              id: normalized.department.id || normalized.department._id,
            };
            delete normalized.department._id;
          }
          delete normalized._id;

          setUser(normalized);
          if (decoded.exp) scheduleLogout(decoded.exp);
        } else {
          logout(); // clears localStorage
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

    const normalized = { ...userData, id: userData.id || userData._id };
    if (normalized.department) {
      normalized.department = {
        ...normalized.department,
        id: normalized.department.id || normalized.department._id,
      };
      delete normalized.department._id;
    }
    delete normalized._id;

    localStorage.setItem("user", JSON.stringify(normalized));
    localStorage.setItem("token", token);
    setUser(normalized);

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
        refreshUser,
        loading: loading, // renamed to match your profile usage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}