import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./OrderForm.css";

const emptyState = {
  clientNumber: "",
  status: "",
  reportStatus: "",
  type: "",
  technician: "",
  closedBy: "",
  reportedToUfinet: false,
  reportCode: "",
  observation: "",
  visitDate: "",
  closeDate: ""
};

export default function OrderForm({
  mode = "create",
  orderId = null,
  initialData = {},
  onSuccess
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyState);

  /* Precargar datos cuando es edición */
  useEffect(() => {
    if (mode === "edit" && initialData?.visits?.length) {
      const lastVisit = initialData.visits.at(-1);
      setForm({
        ...emptyState,
        reportedToUfinet: initialData.reportedToUfinet ?? false,
        status: lastVisit.status || "",
        reportStatus: lastVisit.reportStatus || "",
        type: lastVisit.type || "",
        technician: lastVisit.technician || "",
        closedBy: lastVisit.closedBy || "",
        reportCode: lastVisit.reportCode || "",
        observation: lastVisit.observation || "",
        visitDate: lastVisit.visitDate
          ? new Date(lastVisit.visitDate).toISOString().slice(0, 16)
          : "",
        closeDate: lastVisit.closeDate
          ? new Date(lastVisit.closeDate).toISOString().slice(0, 16)
          : ""
      });
    }
  }, [mode, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.observation.trim()) {
      alert("La observación es obligatoria");
      return;
    }

    const url =
      mode === "edit"
        ? `http://${API_URL}:3000/api/orders/${orderId}/visit`
        : `http://${API_URL}:3000/api/orders/save`;
    const method = mode === "edit" ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.message || "Error al guardar");
      return;
    }

    setForm(emptyState);
    onSuccess?.();
    navigate("/");
  };

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h3>{mode === "edit" ? "Editar Orden" : "Nueva Orden"}</h3>

      <div className="form-grid">
        {/* Cliente */}
        {mode === "create" && (
          <input
            name="clientNumber"
            placeholder="Número de Cliente"
            value={form.clientNumber}
            onChange={handleChange}
            required
          />
        )}

        {/* Tipo */}
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="">Tipo</option>
          <option value="Instalación">Instalación</option>
          <option value="Mudanza">Mudanza</option>
          <option value="Service">Service</option>
          <option value="Retiro equipos">Retiro equipos</option>
        </select>

        {/* Estado Orden */}
        <select name="status" value={form.status} onChange={handleChange} required>
          <option value="">Estado Orden</option>
          <option value="Cerrada">Cerrada</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Cancelada">Cancelada</option>
        </select>

        {/* Técnico */}
        <select name="technician" value={form.technician} onChange={handleChange} required>
          <option value="">Técnico</option>
          <option value="Gionet">Gionet</option>
          <option value="Gustavo">Gustavo</option>
        </select>

        {/* Observación */}
        <textarea
          className="full-width"
          name="observation"
          placeholder="Observación"
          minLength={5}
          required
          value={form.observation}
          onChange={handleChange}
        />

        {/* Cerrado por */}
        <select name="closedBy" value={form.closedBy} onChange={handleChange}>
          <option value="">Cerrado por</option>
          <option value="Juan Cruz Castro">Juan Cruz Castro</option>
          <option value="Fernando Bargas">Fernando Bargas</option>
          <option value="Pablo Correa">Pablo Correa</option>
          <option value="Fiona Colonna">Fiona Colonna</option>
          <option value="Flavio Romero">Flavio Romero</option>
          <option value="Administrador">Administrador</option>
        </select>

        {/* Reportado a Ufinet */}
        <label className="checkbox">
          <input
            type="checkbox"
            name="reportedToUfinet"
            checked={form.reportedToUfinet}
            onChange={handleChange}
          />
          Reportado a Ufinet
        </label>

        {/* Mostrar Reporte / Acción solo si tildado o ya tiene valor */}
        {(form.reportedToUfinet || form.reportCode) && (
          <select name="reportCode" value={form.reportCode} onChange={handleChange}>
            <option value="">Reporte / Acción</option>
            <option value="Puerto sin potencia">Puerto sin potencia</option>
            <option value="Error al confirmar ONT">Error al confirmar ONT</option>
            <option value="Puerto dañado">Puerto dañado</option>
            <option value="Cambio de CTO">Cambio de CTO</option>
            <option value="CTO dañado">CTO dañado</option>
          </select>
        )}

        {form.reportedToUfinet && (
          <select name="reportStatus" value={form.reportStatus} onChange={handleChange} required>
            <option value="">Estado Reporte / Acción</option>
            <option value="Sin reporte">Sin reporte</option>
            <option value="En curso">En curso</option>
            <option value="Listo">Listo</option>
          </select>
        )}

        {/* Fecha Visita */}
        <label>
          Fecha Visita
          <input
            type="datetime-local"
            name="visitDate"
            value={form.visitDate}
            onChange={handleChange}
          />
        </label>

        {/* Fecha Cierre */}
        <label>
          Fecha Cierre
          <input
            type="datetime-local"
            name="closeDate"
            value={form.closeDate}
            onChange={handleChange}
          />
        </label>
      </div>

      {/* Botones */}
      <div className="form-buttons">
        <button className="submit-btn" type="submit">
          {mode === "edit" ? "Agregar Visita" : "Guardar Orden"}
        </button>
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/")}
        >
          ⬅ Volver
        </button>
      </div>
    </form>
  );
}
