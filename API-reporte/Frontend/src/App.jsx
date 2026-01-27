import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { useAuth } from "./context/AuthContext";

import OrdersPage from "./pages/OrdersPage";
import NewOrderPage from "./pages/NewOrderPage";
import Dashboard from "./pages/Dashboard";
import EditOrderPage from "./pages/EditOrderPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import LoginPage from "./pages/LoginPage";
import { Toaster } from "react-hot-toast";

function AppLayout() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Cargando...</p>;

  const hideNavbarRoutes = ["/login"];
  const hideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      <Toaster position="top-right" />
      {!hideNavbar && <Navbar />}

      <div style={{ padding: 20 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/orders"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />

          <Route
            path="/orders/:id/history"
            element={
              <RequireAuth>
                <OrderHistoryPage />
              </RequireAuth>
            }
          />

          <Route
            path="/orders/save"
            element={
              <RequireAdmin>
                <NewOrderPage />
              </RequireAdmin>
            }
          />

          <Route
            path="/orders/:id/edit"
            element={
              <RequireAdmin>
                <EditOrderPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return <AppLayout />;
}
