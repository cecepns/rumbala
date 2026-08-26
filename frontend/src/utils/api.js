import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/rumbala/api";
export const SERVER_BASE_URL = "https://api.kingcreativestudio.my.id/rumbala";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("rumbala_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle global 401 / session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("rumbala_token");
      localStorage.removeItem("rumbala_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
