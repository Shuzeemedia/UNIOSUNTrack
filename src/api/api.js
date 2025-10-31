import axios from "axios";

// Use environment variable or fallback to localhost
const API = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api",
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
    // If offline, mark and let component handle
    if (error.isOffline) {
      return Promise.reject(error);
    }

    // Handle auth errors globally
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;
