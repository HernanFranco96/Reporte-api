import axios from "axios";
import { API_URL } from "../config";

const api = axios.create({
  baseURL: `http://${API_URL}:3000/api`
});

// Interceptor: agrega token a TODAS las requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
