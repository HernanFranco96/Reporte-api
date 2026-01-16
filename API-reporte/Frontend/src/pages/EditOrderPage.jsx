import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import OrderForm from "../components/OrderForm";
import { API_URL } from "../config";

export default function EditOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://${API_URL}:3000/api/orders/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Orden no encontrada");
        }
        return res.json();
      })
      .then(setOrder)
      .catch((err) => {
        alert(err.message);
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
      onSaved={() => navigate("/")}
    />
  );
}
