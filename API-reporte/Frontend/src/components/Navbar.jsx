import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">📊 API Reportes</span>
      </div>

      <div className="navbar-links">
        <NavLink
          to="/"
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

        <NavLink
          to="/orders/save"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Nueva Orden
        </NavLink>
      </div>
    </nav>
  );
}
