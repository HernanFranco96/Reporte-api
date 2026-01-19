import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import OrdersTable from "../components/OrdersTable";
import api from "../api/axios";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 carga inicial
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 🔄 refetch si viene desde create / edit
  useEffect(() => {
    if (location.state?.refresh) {
      fetchOrders();
    }
  }, [location.state, fetchOrders]);

  if (loading) return <p>Cargando órdenes...</p>;
  if (!orders.length) return <p>No hay órdenes</p>;

  return <OrdersTable orders={orders} />;
}
