import axios from "axios";

// Create Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // dynamic from .env
});

// ===================== REQUEST INTERCEPTOR ===================== //
API.interceptors.request.use(
  (config) => {

    if (!navigator.onLine) {
      const error = new Error("You are offline. Please check your internet connection.");
      error.isOffline = true;
      return Promise.reject(error);
    }

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
    if (error.isOffline) return Promise.reject(error);
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
