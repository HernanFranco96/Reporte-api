import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import OrdersPage from "./pages/OrdersPage";
import NewOrderPage from "./pages/NewOrderPage";
import Dashboard from "./pages/Dashboard";
import EditOrderPage from "./pages/EditOrderPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/save" element={<NewOrderPage />} />
          <Route path="/orders/:id/edit" element={<EditOrderPage />} />
          <Route path="/orders/:id/history" element={<OrderHistoryPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
