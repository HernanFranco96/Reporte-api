import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
  const [saving, setSaving] = useState(false);
  const [initialForm, setInitialForm] = useState(null);

  const hasChanges =
    mode === "create" ||
    JSON.stringify(form) !== JSON.stringify(initialForm);

  /* Precargar datos en edición */
  useEffect(() => {
    if (mode === "edit" && initialData?.visits?.length) {
      const lastVisit = initialData.visits.at(-1);

      const populatedForm = {
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
      };

      setForm(populatedForm);
      setInitialForm(populatedForm);

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

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const url =
        mode === "edit"
          ? `http://${API_URL}:3000/api/orders/${orderId}/visit`
          : `http://${API_URL}:3000/api/orders/save`;

      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }

      setForm(emptyState);

      toast.success(
        mode === "edit"
          ? "Visita agregada correctamente"
          : "Orden creada correctamente"
      );

      onSuccess?.(data); // el padre decide a dónde ir
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h3>{mode === "edit" ? "Editar Orden" : "Nueva Orden"}</h3>

      <div className="form-grid">
        {mode === "create" && (
          <input
            name="clientNumber"
            placeholder="Número de Cliente"
            value={form.clientNumber}
            onChange={handleChange}
            required
          />
        )}

        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="">Tipo</option>
          <option value="Instalación">Instalación</option>
          <option value="Mudanza">Mudanza</option>
          <option value="Service">Service</option>
          <option value="Retiro equipos">Retiro equipos</option>
        </select>

        <select name="status" value={form.status} onChange={handleChange} required>
          <option value="">Estado Orden</option>
          <option value="Cerrada">Cerrada</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Cancelada">Cancelada</option>
        </select>

        <select
          name="technician"
          value={form.technician}
          onChange={handleChange}
          required
        >
          <option value="">Técnico</option>
          <option value="Gionet">Gionet</option>
          <option value="Gustavo">Gustavo</option>
        </select>

        <textarea
          className="full-width"
          name="observation"
          placeholder="Observación"
          minLength={5}
          required
          value={form.observation}
          onChange={handleChange}
        />

        <select name="closedBy" value={form.closedBy} onChange={handleChange}>
          <option value="">Seleccione Agente</option>
          <option value="Juan Cruz Castro">Juan Cruz Castro</option> 
          <option value="Fernando Bargas">Fernando Bargas</option> 
          <option value="Pablo Correa">Pablo Correa</option> 
          <option value="Fiona Colonna">Fiona Colonna</option> 
          <option value="Flavio Romero">Flavio Romero</option> 
          <option value="Administrador">Administrador</option>
        </select>

        <label className="checkbox">
          <input
            type="checkbox"
            name="reportedToUfinet"
            checked={form.reportedToUfinet}
            onChange={handleChange}
          />
          Reportado a Ufinet
        </label>

        {(form.reportedToUfinet || form.reportCode) && (
          <select
            name="reportCode"
            value={form.reportCode}
            onChange={handleChange}
          >
            <option value="">Reporte / Acción</option>
            <option value="Puerto sin potencia">Puerto sin potencia</option> 
            <option value="Error al confirmar ONT">Error al confirmar ONT</option> 
            <option value="Puerto dañado">Puerto dañado</option> 
            <option value="Cambio de CTO">Cambio de CTO</option> 
            <option value="CTO dañado">CTO dañado</option>
          </select>
        )}

        {form.reportedToUfinet && (
          <select
            name="reportStatus"
            value={form.reportStatus}
            onChange={handleChange}
            required
          >
            <option value="">Estado Reporte</option>
            <option value="En curso">En curso</option>
            <option value="Listo">Listo</option>
          </select>
        )}

        <label>
          Fecha Visita
          <input
            type="datetime-local"
            name="visitDate"
            value={form.visitDate}
            onChange={handleChange}
          />
        </label>

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

      <div className="form-buttons">
        <button
          className="submit-btn"
          type="submit"
          disabled={saving || !hasChanges}
        >
          {saving
            ? "Guardando..."
            : mode === "edit"
            ? "Agregar Visita"
            : "Guardar Orden"}
        </button>

        <button type="button" className="back-btn" onClick={() => navigate("/orders")}>
          ⬅ Volver
        </button>
      </div>
    </form>
  );
}
