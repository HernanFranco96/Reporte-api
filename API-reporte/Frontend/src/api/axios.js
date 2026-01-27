import axios from "axios";
import { API_URL } from "../config";

const api = axios.create({
  baseURL: `http://${API_URL}:3000/api`
});

// 👉 Request: agrega token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 👉 Response: token inválido / expirado
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      // limpiar header
      delete api.defaults.headers.common.Authorization;

      // redirección forzada
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
