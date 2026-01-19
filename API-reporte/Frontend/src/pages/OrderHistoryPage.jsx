import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./OrderHistoryPage.css";

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toLocaleDateString("es-AR");
};

export default function OrderHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(res => {
        setOrder(res.data);
      })
      .catch(err => {
        console.error("Error cargando historial:", err);
        setError("No se pudo cargar la orden");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading">Cargando historial...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="error">Orden no encontrada</p>;

  return (
    <div className="history-page">
      <h2>📜 Historial de la Orden</h2>

      <div className="order-info">
        <p><b>Cliente:</b> {order.clientNumber || "-"}</p>
        <p><b>Reportado a Ufinet:</b> {order.reportedToUfinet ? "Sí" : "No"}</p>
        <p><b>Creada:</b> {formatDate(order.createdAt)}</p>
      </div>

      <hr />

      <div className="visits">
        {Array.isArray(order.visits) && order.visits.length > 0 ? (
          order.visits.map((v, index) => (
            <div className="visit-card" key={index}>
              <h4>Visita #{index + 1}</h4>

              <div className="visit-details">
                <p><b>Estado:</b> {v.status || "-"}</p>
                <p><b>Tipo:</b> {v.type || "-"}</p>
                <p><b>Técnico:</b> {v.technician || "-"}</p>
                <p><b>Cerrado por:</b> {v.closedBy || "-"}</p>
                <p><b>Reporte / Acción:</b> {v.reportCode || "-"}</p>
                <p><b>Estado Reporte:</b> {v.reportStatus || "-"}</p>

                <p><b>Observación:</b></p>
                <p className="observation">{v.observation || "-"}</p>

                <p><b>Fecha Visita:</b> {formatDate(v.visitDate)}</p>
                <p><b>Fecha Cierre:</b> {formatDate(v.closeDate)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="empty">No hay visitas registradas</p>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate("/orders")}>
        ⬅ Volver
      </button>
    </div>
  );
}
