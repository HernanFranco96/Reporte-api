import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import OrderForm from "../components/OrderForm";
import api from "../api/axios";

export default function EditOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(res => {
        setOrder(res.data);
      })
      .catch(err => {
        console.error("Error cargando orden:", err);

        if (err.response?.status === 404) {
          alert("Orden no encontrada");
        } else if (err.response?.status === 401) {
          alert("Sesión expirada");
          navigate("/login");
          return;
        } else {
          alert("Error al cargar la orden");
        }

        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <p>Cargando...</p>;
  if (!order) return null;

  return (
    <OrderForm
      mode="edit"
      orderId={order._id}
      initialData={order}
      onSaved={() => navigate("/orders")}
    />
  );
}
