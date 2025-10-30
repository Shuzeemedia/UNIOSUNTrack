// src/api/api.js
import axios from "axios";

// Dynamically pick the correct base URL
const API = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5000/api"
      : import.meta.env.VITE_API_URL || "https://your-backend-domain.com/api",
});

// ===================== REQUEST INTERCEPTOR ===================== //
API.interceptors.request.use(
  (config) => {
    // Stop request if offline
    if (!navigator.onLine) {
      const error = new Error("You are offline. Please check your internet connection.");
      error.isOffline = true;
      return Promise.reject(error);
    }

    // Attach token if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===================== RESPONSE INTERCEPTOR ===================== //
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.isOffline) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // Auto logout on unauthorized
    if (status === 401 || status === 403) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;
