// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);

        // token expirado
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
        } else {
          setUser({
            id: decoded.id,
            role: decoded.role
          });

          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem("token");
      }
    }

    setLoading(false);
  }, []);

  // Login
  const login = async (email, password) => {
    const res = await axios.post(
      "http://192.168.131.141:3000/api/auth/login",
      { email: email.trim(), password: password.trim() }
    );

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(user);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
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
