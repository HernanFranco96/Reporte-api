import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">📊 API Reportes</span>
      </div>

      <div className="navbar-links">

        {/* No logueado */}
        {!user && (
          <NavLink to="/login" className="nav-link">
            Login
          </NavLink>
        )}

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Inicio
        </NavLink>

        <NavLink
          to="/orders"
          end
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Órdenes
        </NavLink>

        {user?.role === "admin" && (
          <NavLink
            to="/orders/save"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Nueva Orden
          </NavLink>
        )}

        {/* 🚪 Logout */}
        {user && (
          <NavLink
            to="#"
            className="nav-link logout"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
          >
            Salir
          </NavLink>
        )}
      </div>
    </nav>
  );
}
