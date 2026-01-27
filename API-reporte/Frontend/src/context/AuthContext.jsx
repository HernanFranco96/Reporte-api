import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restaurar sesión
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
        } else {
          setUser({
            id: decoded.id,
            role: decoded.role
          });

          api.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem("token");
      }
    }

    setLoading(false);
  }, []);

  // Interceptor global
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      res => res,
      error => {
        if (error.response?.status === 401) {
          logout();
          navigate("/login");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // Detectar token faltante
  useEffect(() => {
    const onStorageChange = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        logout();
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  // Login
  const login = async (email, password) => {
    const res = await api.post("/auth/login", {
      email: email.trim(),
      password: password.trim()
    });

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(user);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
