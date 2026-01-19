import { useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./OrdersTable.css";

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toLocaleDateString("es-AR");
};

export default function OrdersTable({ orders }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sortOrder, setSortOrder] = useState("desc");
  const [clientSearch, setClientSearch] = useState("");

  // --- FILTROS ---
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    technician: "",
    closedBy: "",
    reportCode: "",
    reportStatus: "", 
    visitDate: "",
    closeDate: "",
    createdAt: ""
  });

  // Dropdown abierto
  const [openFilter, setOpenFilter] = useState(null);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      status: "",
      technician: "",
      closedBy: "",
      reportCode: "",
      reportStatus: "",
      visitDate: "",
      closeDate: "",
      createdAt: ""
    });

    setClientSearch("");
  };

  // --- FILTRAR ORDENES ---
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const lastVisit = o.visits?.at(-1) || {};

      const matchesClient = clientSearch
        ? String(o.clientNumber)
            .toLowerCase()
            .includes(clientSearch.toLowerCase())
        : true;

      const matchesType = filters.type ? lastVisit.type === filters.type : true;
      const matchesStatus = filters.status ? lastVisit.status === filters.status : true;
      const matchesTech = filters.technician ? lastVisit.technician === filters.technician : true;
      const matchesClosedBy = filters.closedBy ? lastVisit.closedBy === filters.closedBy : true;
      const matchesVisitDate = filters.visitDate
        ? lastVisit.visitDate?.slice(0, 10) === filters.visitDate
        : true;
      const matchesCloseDate = filters.closeDate
        ? lastVisit.closeDate?.slice(0, 10) === filters.closeDate
        : true;
      const matchesCreated = filters.createdAt
        ? o.createdAt?.slice(0, 10) === filters.createdAt
        : true;
      const matchesReportStatus = filters.reportStatus
        ? lastVisit.reportStatus === filters.reportStatus
        : true;
      const matchesReportCode = filters.reportCode
        ? lastVisit.reportCode === filters.reportCode
        : true;


      return (
        matchesClient &&
        matchesType &&
        matchesStatus &&
        matchesTech &&
        matchesClosedBy &&
        matchesVisitDate &&
        matchesCloseDate &&
        matchesCreated &&
        matchesReportCode &&
        matchesReportStatus
      );
    });
  }, [orders, filters, clientSearch]);

  // --- PAGINACIÓN ---
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const diff = new Date(a.createdAt) - new Date(b.createdAt);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [filteredOrders, sortOrder]);

  const currentOrders = sortedOrders.slice(startIdx, endIdx);

  // --- OPCIONES PARA FILTROS ---
  const typeOptions = ["Instalación", "Mudanza", "Service", "Retiro equipos"];
  const statusOptions = ["Cerrada", "Pendiente", "Cancelada"];
  const technicianOptions = ["Gionet", "Gustavo"];
  const closedByOptions = ["Juan Cruz Castro","Fernando Bargas","Pablo Correa","Fiona Colonna","Flavio Romero","Administrador"];
  const reportCodeOptions = [
    "Puerto sin potencia",
    "Error al confirmar ONT",
    "Puerto dañado",
    "Cambio de CTO",
    "Instalado / Service sin visibilidad en Netnumen",
    "Problema general"
  ];
  const reportStatusOptions = ["Sin reporte", "En curso", "Listo"];

  // --- Cerrar dropdown al click fuera ---
  const wrapperRef = useRef();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, clientSearch]);

  return (
    <div className="orders-table-wrapper" ref={wrapperRef}>
      <div className="filters-top">
        <input
          type="text"
          placeholder="🔍 Buscar por Nº de cliente"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="client-search"
        />

        <button className="clear-btn" onClick={clearFilters}>
          🧹 Limpiar filtros
        </button>
      </div>

      <div className="table-scroll">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Cliente</th>

              <th onClick={() => setOpenFilter(openFilter === "type" ? null : "type")}>
                Tipo ▼
                {openFilter === "type" && (
                  <div className="filter-dropdown">
                    {typeOptions.map((t) => (
                      <div key={t} onClick={() => handleFilterChange("type", t)}>{t}</div>
                    ))}
                  </div>
                )}
              </th>

              <th onClick={() => setOpenFilter(openFilter === "status" ? null : "status")}>
                Estado ▼
                {openFilter === "status" && (
                  <div className="filter-dropdown">
                    {statusOptions.map((s) => (
                      <div key={s} onClick={() => handleFilterChange("status", s)}>{s}</div>
                    ))}
                  </div>
                )}
              </th>

              <th onClick={() => setOpenFilter(openFilter === "technician" ? null : "technician")}>
                Técnico ▼
                {openFilter === "technician" && (
                  <div className="filter-dropdown">
                    {technicianOptions.map((t) => (
                      <div key={t} onClick={() => handleFilterChange("technician", t)}>{t}</div>
                    ))}
                  </div>
                )}
              </th>

              <th onClick={() => setOpenFilter(openFilter === "closedBy" ? null : "closedBy")}>
                Cerrado por ▼
                {openFilter === "closedBy" && (
                  <div className="filter-dropdown">
                    {closedByOptions.map((c) => (
                      <div key={c} onClick={() => handleFilterChange("closedBy", c)}>{c}</div>
                    ))}
                  </div>
                )}
              </th>

              <th>Observación</th>
              <th>Reportado a Ufinet</th>

              <th onClick={() => setOpenFilter(openFilter === "reportCode" ? null : "reportCode")}>
                Reporte / Acción ▼
                {openFilter === "reportCode" && (
                  <div className="filter-dropdown">
                    {reportCodeOptions.map((r) => (
                      <div key={r} onClick={() => handleFilterChange("reportCode", r)}>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </th>

              <th
                  onClick={() =>
                    setOpenFilter(openFilter === "reportStatus" ? null : "reportStatus")
                  }
                >
                  Estado Reporte / Acción ▼
                  {openFilter === "reportStatus" && (
                    <div className="filter-dropdown">
                      {reportStatusOptions.map((s) => (
                        <div
                          key={s}
                          onClick={() => handleFilterChange("reportStatus", s)}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

              <th>
                Fecha Visita
                <input type="date" value={filters.visitDate} onChange={(e) => handleFilterChange("visitDate", e.target.value)} />
              </th>

              <th>
                Fecha Cierre
                <input type="date" value={filters.closeDate} onChange={(e) => handleFilterChange("closeDate", e.target.value)} />
              </th>

              <th onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                Creado {sortOrder === "asc" ? "▲" : "▼"}
              </th>

              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {currentOrders.map((o) => {
              const lastVisit = o.visits?.at(-1);
              const status = lastVisit?.status || "";
              return (
                <tr key={o._id} data-status={status}>
                  <td>{o.clientNumber}</td>
                  <td>{status || "-"}</td>
                  <td>{lastVisit?.type || "-"}</td>
                  <td>{lastVisit?.technician || "-"}</td>
                  <td>{lastVisit?.closedBy || "-"}</td>
                  <td>{lastVisit?.observation || "-"}</td>
                  <td>{o.reportedToUfinet ? "Sí" : "No"}</td>
                  <td>{lastVisit?.reportCode || "-"}</td>
                  <td>{lastVisit?.reportStatus || "-"}</td>
                  <td>{formatDate(lastVisit?.visitDate)}</td>
                  <td>{formatDate(lastVisit?.closeDate)}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td className="actions">
                    {user?.role === "admin" && (
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/orders/${o._id}/edit`)}
                      >
                        ✏️ Editar
                      </button>
                    )}
                    <button className="history-btn" onClick={() => navigate(`/orders/${o._id}/history`)}>📜 Historial</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>◀ Anterior</button>
          <span>Página {currentPage} de {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente ▶</button>
        </div>
      )}
    </div>
  );
}
