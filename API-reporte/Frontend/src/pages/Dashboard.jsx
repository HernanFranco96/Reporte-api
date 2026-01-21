// Dashboard.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Line, LineChart, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import api from "../api/axios";
import "./Dashboard.css";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#f38830", "#A28CFE", "#FF6B6B"];

const PAGE_HEIGHT = 297; // A4 en mm
const MARGIN_BOTTOM = 10;

const checkPageBreak = (pdf, y, neededHeight) => {
  if (y + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
    pdf.addPage();
    return 10; // reset Y al inicio de la nueva página
  }
  return y;
};

export default function Dashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [techData, setTechData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [closedByZoneData, setClosedByZoneData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [techEffectiveness, setTechEffectiveness] = useState([]);
  const [dailyClosedData, setDailyClosedData] = useState([]);

  const [prevAgentData, setPrevAgentData] = useState([]);
  const [prevTechData, setPrevTechData] = useState([]);

  const [ordersRaw, setOrdersRaw] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();

  /** TOTAL SEMANA ACTUAL **/
  const totalTechVisits = techData.reduce(
    (acc, t) => acc + t.cerradas + t.pendientes + t.canceladas,
    0
  );

  const totalAgentClosed = agentData.reduce(
    (acc, a) => acc + a.closed,
    0
  );

  /** TOTAL SEMANA ANTERIOR **/
  const prevTechTotal = prevTechData.reduce(
    (acc, t) => acc + (t.cerradas || 0) + (t.pendientes || 0) + (t.canceladas || 0),
    0
  );

  const prevAgentTotal = prevAgentData.reduce(
    (acc, a) => acc + (a.closedOrders || 0),
    0
  );

  const fetchData = (fromParam, toParam) => {
    const params = {
      from: fromParam || from,
      to: toParam || to
    };

    // Técnicos con más visitas cerradas
    api.get("/stats/technicians", { params })
      .then(res => setTechData(res.data.map(t => ({
        name: t._id || "Desconocido",
        cerradas: t.cerradas || 0,
        pendientes: t.pendientes || 0,
        canceladas: t.canceladas || 0
      }))))
      .catch(console.error);

    // Agentes con más órdenes cerradas
    api.get(`/stats/agents`, { params })
      .then(res => setAgentData(res.data.map(a => ({ name: a._id, closed: a.closedOrders }))))
      .catch(console.error);

    // Ordenes cerradas por dia
    api.get("/stats/closed-by-day", { params })
      .then(res => {
        setDailyClosedData(res.data.map(d => ({ date: d.date, count: d.count })));
      })
      .catch(console.error);

    // Órdenes cerradas por zona
    api.get(`/stats/orders/closed-by-zone`, { params })
      .then(res => setClosedByZoneData(
        res.data.map(z => ({ name: z._id, value: z.count }))
      ))
      .catch(console.error);

    // Órdenes abiertas / cerradas
    api.get(`/stats/orders/status`, { params })
      .then(res => setStatusData(res.data.map(s => ({ name: s._id || "Desconocido", value: s.count }))))
      .catch(console.error);

    // Tipos de visitas
    api.get(`/stats/visits/types`, { params })
      .then(res => setTypeData(res.data.map(t => ({ name: t._id || "Desconocido", value: t.count }))))
      .catch(console.error);

    // Promedio de efectividad
    api.get(`/stats/resolution/technician-effectiveness`, { params })
      .then(res =>
        setTechEffectiveness(
           res.data.map(t => ({
            name: t._id || "Desconocido",
            total: t.totalOrders,
            problems: t.ordersWithProblem,
            ok: t.totalOrders - t.ordersWithProblem,
            effectiveness: t.effectiveness
          }))
        )
      )
      .catch(console.error);



    const prev = getPreviousWeekRange();

    api.get(`/stats/technicians`, { params: prev })
      .then(res => setPrevTechData(res.data))
      .catch(console.error);

    api.get(`/stats/agents`, { params: prev })
      .then(res => {
        setPrevAgentData(
          res.data.map(a => ({ closedOrders: a.closedOrders || 0 }))
        );
      })
      .catch(console.error);

    api.get(`/stats/reportWeek`, { params })
      .then(res => setOrdersRaw(res.data))
      .catch(console.error);
  };

  const addPageTitle = (pdf, title, subtitle = "") => {
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.text(title, 10, 15);

    if (subtitle) {
      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      pdf.text(subtitle, 10, 22);
    }

    return 30;
  };

  const addPageNumbers = (pdf) => {
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.text(
          `Página ${i} de ${pageCount}`,
          pdf.internal.pageSize.getWidth() - 40,
          PAGE_HEIGHT - 5
        );
      }
  };

  const getStatusTotals = () => {
    const totals = { total: 0 };
    statusData.forEach(s => {
      totals[s.name] = s.value;
      totals.total += s.value;
    });
    return totals;
  };

  const getTypeTotals = () => {
    const totals = { total: 0 };
    typeData.forEach(t => {
      totals[t.name] = t.value;
      totals.total += t.value;
    });
    return totals;
  };

  const drawTable = (pdf, y, title, rows) => {
    // Título tabla
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text(title, 10, y);
    y += 5;

    // Header
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.text("Cliente", 10, y);
    pdf.text("Estado", 40, y);
    pdf.text("Observación", 70, y);
    pdf.text("Visita", 150, y);
    pdf.text("Cierre", 180, y);

    // línea header
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.3);
    pdf.line(10, y + 1, 200, y + 1);
    y += 4;

    pdf.setFont(undefined, "normal");

   rows.forEach(r => {
    const statusLines = pdf.splitTextToSize(r.status || "-", 20);
    const obsLines = pdf.splitTextToSize(r.obs || "-", 70);
    const visitLines = pdf.splitTextToSize(r.visit || "-", 25);
    const closeLines = pdf.splitTextToSize(r.close || "-", 25);

    const rowHeight = Math.max(
      statusLines.length,
      obsLines.length,
      visitLines.length,
      closeLines.length
    ) * 4;

    y = checkPageBreak(pdf, y, rowHeight + 2);

    pdf.text(String(r.client), 10, y);
    pdf.text(statusLines, 40, y);
    pdf.text(obsLines, 70, y);
    pdf.text(visitLines, 150, y);
    pdf.text(closeLines, 180, y);

    y += rowHeight + 2;
  });

    return y + 6;
  };

  const formatDate = d =>
  d ? new Date(d).toISOString().slice(0, 10) : "-";

  const getLastVisit = (order) => {
    if (!order.visits || order.visits.length === 0) return null;
    return order.visits[order.visits.length - 1];
  };

  const isCloseInRange = (visit, from, to) => {
    if (!visit?.closeDate) return false;

    const d = new Date(visit.closeDate);

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    return d >= fromDate && d <= toDate;
  };

  const buildRowsByVisits = (orders, filterFn) => {

    return orders
      .map(order => {

        const matchingVisits = order.visits?.filter(v => {
          const matchFilter = filterFn(v);
          const matchDate = isVisitInRange(v, from, to);

          return matchFilter && matchDate;
        });

        if (!matchingVisits || matchingVisits.length === 0) {
          return null;
        }

        return {
          client: order.clientNumber,
          status: matchingVisits.map(v => v.status || "-").join("\n"),
          obs: matchingVisits.map((v, i) => `(${i + 1}) ${v.observation}`).join("\n"),
          visit: matchingVisits.map(v => formatDate(v.visitDate)).join("\n"),
          close: matchingVisits.map(v => formatDate(v.closeDate)).join("\n")
        };
      })
      .filter(Boolean);
  };

  const buildRowsByClosedOrders = (orders, agentName) => {
    return orders
      .map(order => {
        const lastVisit = getLastVisit(order);

        if (!lastVisit) return null;

        // Tiene que estar cerrada
        if (!/^cerrada$/i.test(lastVisit.status)) return null;

        // Tiene que cerrar en rango
        if (!isCloseInRange(lastVisit, from, to)) return null;

        // Tiene que cerrar este agente
        if (lastVisit.closedBy !== agentName) return null;

        return {
          client: order.clientNumber,
          status: lastVisit.status,
          obs: lastVisit.observation || "-",
          visit: formatDate(lastVisit.visitDate),
          close: formatDate(lastVisit.closeDate)
        };
      })
      .filter(Boolean);
  };

  const isVisitInRange = (visit, from, to) => {
    if (!visit.visitDate) return false;

    const d = new Date(visit.visitDate);

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    return d >= fromDate && d <= toDate;
  };

  const estimateTableHeight = (pdf, rows) => {
    let height = 20; // título + header

    rows.forEach(r => {
      const statusLines = pdf.splitTextToSize(r.status || "-", 20);
      const obsLines = pdf.splitTextToSize(r.obs || "-", 70);
      const visitLines = pdf.splitTextToSize(r.visit || "-", 25);
      const closeLines = pdf.splitTextToSize(r.close || "-", 25);

      const rowHeight =
        Math.max(statusLines.length, obsLines.length, visitLines.length, closeLines.length) * 4;

      height += rowHeight + 2;
    });

    return height;
  };

  const drawDivider = (pdf, y) => {
    pdf.setDrawColor(200);      // gris claro
    pdf.setLineWidth(0.3);
    pdf.line(10, y, 200, y);    // ancho útil A4
    return y + 6;
  };

const toLocalDateOnly = (d) => {
  const date = new Date(d);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const buildProblemRowsByTechnicianThisWeek = (orders, technicians) => {
  const rows = orders.flatMap(order => {
    if (!Array.isArray(order.visits) || order.visits.length === 0) {
      return [];
    }

    return order.visits
      .filter(v => v.reportCode && v.reportCode.trim())
      .filter(v => technicians.includes(v.technician))
      .filter(v => {
        const visitDate = toLocalDateOnly(v.visitDate);
        const fromLocal = toLocalDateOnly(from);
        const toLocal = toLocalDateOnly(to);
        return visitDate >= fromLocal && visitDate <= toLocal;
      })
      .map(v => ({
        technician: v.technician,
        client: order.clientNumber,
        status: v.status || "-",
        obs: `Reporte: ${v.reportCode}\n${v.observation || "-"}`,
        visit: formatDate(v.visitDate),
        close: v.closeDate ? formatDate(v.closeDate) : "-"
      }));
  });

  // 🔽 AGRUPAR POR TÉCNICO
  return rows.reduce((acc, row) => {
    if (!acc[row.technician]) {
      acc[row.technician] = [];
    }
    acc[row.technician].push(row);
    return acc;
  }, {});
};

  // Función exportar PDF
const exportPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();

    // ======================
    // PÁGINA 1 - TÉCNICOS
    // ======================
    let y = addPageTitle(
      pdf,
      "Visitas de Técnicos",
      `Período: ${from} al ${to}`
    );

    const techChart = document.getElementById("tech-chart");
    if (techChart) {
      const canvas = await html2canvas(techChart, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
      y += imgHeight + 6;

      pdf.setFontSize(11);
      pdf.text(`Total visitas de técnicos: ${totalTechVisits}`, 10, y);
      y += 6;

      techData.forEach(t => {
        pdf.text(
          `${t.name} total: ${t.cerradas + t.pendientes + t.canceladas} - Cerradas: ${t.cerradas} - Pendientes: ${t.pendientes} - Canceladas: ${t.canceladas}`,
          12,
          y
        );
        y += 5;
      });
    }

    techData.forEach((tech, index) => {
      const rows = buildRowsByVisits(
        ordersRaw,
        v => v.technician === tech.name
      );

      if (rows.length > 0) {
        const tableHeight = estimateTableHeight(pdf, rows);

        if (y + tableHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          pdf.addPage();
          y = 10;
        }

        y = drawTable(pdf, y, `Técnico: ${tech.name}`, rows);

        // divisor si hay espacio y no es el último
        if (index < techData.length - 1 && y < PAGE_HEIGHT - 30) {
          y = drawDivider(pdf, y);
        }
      }
    });

    // ======================
    // PÁGINA 2 - AGENTES
    // ======================
    pdf.addPage();
    y = addPageTitle(
      pdf,
      "Órdenes Cerradas por Agentes",
      `Período: ${from} al ${to}`
    );

    const agentChart = document.getElementById("agent-chart");
    if (agentChart) {
      const canvas = await html2canvas(agentChart, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
      y += imgHeight + 6;

      pdf.setFontSize(11);
      pdf.text(`Total órdenes cerradas por agentes: ${totalAgentClosed}`, 10, y);
      y += 6;

      agentData.forEach(a => {
        pdf.text(`${a.name}: ${a.closed} órdenes cerradas`, 12, y);
        y += 5;
      });
    }

    agentData.forEach((agent, index) => {
      const rows = buildRowsByClosedOrders(
        ordersRaw,
        agent.name
      );

      if (rows.length > 0) {
        const tableHeight = estimateTableHeight(pdf, rows);

        if (y + tableHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          pdf.addPage();
          y = 10;
        }

        y = drawTable(pdf, y, `Agente: ${agent.name}`, rows);

        if (index < agentData.length - 1 && y < PAGE_HEIGHT - 30) {
          y = drawDivider(pdf, y);
        }
      }
    });

    // ======================
    // PÁGINA 3 - DISTRIBUCIÓN + RESUMEN FINAL
    // ======================
    pdf.addPage();
    y = addPageTitle(
      pdf,
      "Distribución de Órdenes y Visitas",
      `Período: ${from} al ${to}`
    );

    const statusTotals = getStatusTotals();
    const typeTotals = getTypeTotals();

    // ======================
    // GRÁFICO: ÓRDENES
    // ======================
    {
      const chartEl = document.getElementById("status-chart");
      if (chartEl) {
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.text("Órdenes abiertas / cerradas", 10, y);
        y += 6;

        const canvas = await html2canvas(chartEl, {
          scale: 1.6,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const imgHeight =
          (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
        y += imgHeight + 6;

        pdf.setFontSize(11);
        pdf.setFont(undefined, "normal");
        pdf.text(`Total órdenes: ${statusTotals.total}`, 12, y);
        y += 5;

        Object.entries(statusTotals).forEach(([k, v]) => {
          if (k !== "total") {
            pdf.text(`• ${k}: ${v}`, 14, y);
            y += 4;
          }
        });

        y += 8;
      }
    }

    // ==================================
    // GRÁFICO: ÓRDENES CERRADAS POR ZONA
    // ==================================
    y = checkPageBreak(pdf, y, 140);
    const zoneChartEl = document.getElementById("zone-chart");
    if (zoneChartEl) {
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("Órdenes cerradas por zona", 10, y);
      y += 6;

      const canvas = await html2canvas(zoneChartEl, {
        scale: 1.6,
        backgroundColor: "#ffffff",
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
      y += imgHeight + 6;

      const totalClosed = closedByZoneData.reduce((a,b)=>a+b.value,0);
      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      pdf.text(`Total órdenes cerradas: ${totalClosed}`, 12, y);
      y += 5;

      closedByZoneData.forEach(z => {
        pdf.text(`• ${z.name}: ${z.value}`, 14, y);
        y += 4;
      });

      y += 10;
    }

    // ======================
    // GRÁFICO: TIPOS DE VISITA
    // ======================
    y = checkPageBreak(pdf, y, 140);

    {
      const chartEl = document.getElementById("type-chart");
      if (chartEl) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, "bold");
        pdf.text("Tipos de visitas", 10, y);
        y += 6;

        const canvas = await html2canvas(chartEl, {
          scale: 1.6,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const imgHeight =
          (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
        y += imgHeight + 6;

        pdf.setFontSize(11);
        pdf.setFont(undefined, "normal");
        pdf.text(`Total visitas: ${typeTotals.total}`, 12, y);
        y += 5;

        Object.entries(typeTotals).forEach(([k, v]) => {
          if (k !== "total") {
            pdf.text(`• ${k}: ${v}`, 14, y);
            y += 4;
          }
        });

        y += 10;
      }
    }

    // ======================
    // GRÁFICO: EFECTIVIDAD DE TÉCNICOS
    // ======================
    y = checkPageBreak(pdf, y, 140);

    const effectivenessChart = document.getElementById("tech-effectiveness-chart");

    if (effectivenessChart) {
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("Efectividad de técnicos (órdenes sin reporte)", 10, y);
      y += 6;

      const canvas = await html2canvas(effectivenessChart, {
        scale: 1.6,
        backgroundColor: "#ffffff",
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, imgHeight);
      y += imgHeight + 6;

      // Resumen numérico debajo del gráfico
      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");

      techEffectiveness.forEach(t => {
        pdf.text(
          `• ${t.name}: ${t.ok}/${t.total} sin problemas (${t.effectiveness}%)`,
          12,
          y
        );
        y += 4;
      });

      y += 8;

      // ======================
      // TABLAS: ÓRDENES CON PROBLEMAS POR TÉCNICO (SEMANA ACTUAL)
      // ======================

      const TECHNICIANS = ["Gustavo", "Gionet"];

      const groupedRows = buildProblemRowsByTechnicianThisWeek(
        ordersRaw,
        TECHNICIANS
      );

      Object.entries(groupedRows).forEach(([technician, rows]) => {
        if (rows.length === 0) return;

        const tableHeight = estimateTableHeight(pdf, rows);

        if (y + tableHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          pdf.addPage();
          y = 10;
        }

        y = drawTable(
          pdf,
          y,
          `Órdenes con problemas – ${technician}`,
          rows
        );

        y = drawDivider(pdf, y);
      });

    }

    // ======================
    // RESUMEN EJECUTIVO (SIEMPRE AL FINAL)
    // ======================
    y = checkPageBreak(pdf, y, 80);

    pdf.setFontSize(14);
    pdf.setFont(undefined, "bold");
    pdf.text("Resumen Ejecutivo", 10, y);
    y += 8;

    pdf.setFontSize(11);
    pdf.setFont(undefined, "normal");

    pdf.text(`• Total visitas técnicas: ${totalTechVisits}`, 12, y);
    y += 5;

    const techDiff = totalTechVisits - prevTechTotal;
    pdf.text(
      `• Variación vs semana anterior: ${techDiff >= 0 ? "+" : "-"}${Math.abs(techDiff)}`,
      12,
      y
    );
    y += 6;

    pdf.text(`• Total órdenes cerradas por agentes: ${totalAgentClosed}`, 12, y);
    y += 5;

    const agentDiff = totalAgentClosed - prevAgentTotal;
    pdf.text(
      `• Variación vs semana anterior: ${agentDiff >= 0 ? "+" : "-"}${Math.abs(agentDiff)}`,
      12,
      y
    );

    // 📄 Numerar páginas
    addPageNumbers(pdf);

    pdf.save(`dashboard_${from}_to_${to}.pdf`);
  };

  // Función semana anterior
  const getPreviousWeekRange = () => {
    const now = new Date();
    const day = now.getDay();

    const end = new Date(now);
    end.setDate(now.getDate() - day - 1);
    end.setHours(23,59,59,999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0,0,0,0);

    const f = d => d.toISOString().split("T")[0];
    return { from: f(start), to: f(end) };
  };

  const getCurrentWeekRangeFrontend = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); 

    // Retrocedemos al domingo
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    // Avanzamos al sábado
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    // Formatear para input[type="date"]
    const formatDate = d => d.toISOString().split("T")[0];

    return {
      from: formatDate(sunday),
      to: formatDate(saturday)
    };
  };

  const clearFilter = () => {
    const { from, to } = getCurrentWeekRangeFrontend();
    setFrom(from);
    setTo(to);
    fetchData(from, to);
  };

  useEffect(() => {
    if (location.state?.refresh) {
      fetchData(from, to);

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    const updateWeek = () => {
      const { from, to } = getCurrentWeekRangeFrontend();
      setFrom(from);
      setTo(to);
      fetchData(from, to);
    };

    updateWeek(); // inicial

    // Calcular milisegundos hasta próximo domingo 00:00
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - dayOfWeek));
    nextSunday.setHours(0,0,0,0);

    const timeout = nextSunday - now;

    const timer = setTimeout(() => {
      updateWeek();
      // opcional: volver a programar para siguiente domingo
    }, timeout);

    return () => clearTimeout(timer);
  }, []);

  // Color por agente
  const getColorByName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  const totalTypeVisits = typeData.reduce((a, b) => a + b.value, 0);
  const totalStatusOrders = statusData.reduce((a, b) => a + b.value, 0);

  const createPieLabel = (total) => ({
    cx,
    cy,
    midAngle,
    outerRadius,
    value
  }) => {
    const RAD = Math.PI / 180;

    // Distancia base + extra según ángulo
    const baseOffset = 18;
    const verticalBoost =
      Math.abs(Math.sin(midAngle * RAD)) > 0.85 ? 10 : 0;

    const r = outerRadius + baseOffset + verticalBoost;

    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);

    const percent = total
      ? Math.round((value / total) * 100)
      : 0;

    if (percent < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {value}
        <tspan fontSize={11} fill="#6b7280">
          {` (${percent}%)`}
        </tspan>
      </text>
    );
  };

  const formattedData = (dailyClosedData || []).map(d => ({
    date: d.date, 
    count: d.count
  }));

  const chartHeight = Math.max(techEffectiveness.length * 60, 200);

  const getEffectivenessColor = (value) => {
    if (value >= 80) return "#22c55e"; // verde
    if (value >= 50) return "#eab308"; // amarillo
    return "#ef4444";                 // rojo
  };

  return (
    <div className="dashboard" id="dashboard-content">
      {/* FILTROS */}
       <div className="filters">
        <label>
          Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <div className="filter-buttons">
          <button onClick={() => fetchData(from, to)}>Filtrar</button>
          <button className="clear-btn" onClick={clearFilter}>Limpiar filtro</button>
        </div>

        <button className="export-btn" onClick={exportPDF}>
          Exportar PDF
        </button>
      </div>

      <h3 className="date-range">Mostrando datos desde <span>{from}</span> hasta <span>{to}</span></h3>

      {/* GRÁFICAS */}
      <section className="charts-section">

        <h2>Órdenes cerradas por día</h2>
        <ResponsiveContainer width="100%" height={300} id="daily-closed-chart">
           <LineChart width={800} height={300} data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={dateStr => {
                const [year, month, day] = dateStr.split("-");
                return `${day}/${month}`;
              }}
            />
            <Tooltip 
              formatter={(value, name, props) => value} 
              labelFormatter={dateStr => {
                const [year, month, day] = dateStr.split("-");
                return `${day}/${month}/${year}`;
              }}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>

        <h2>Visitas realizadas por los técnicos</h2>
        <ResponsiveContainer width="100%" height={300} id="tech-chart">
          <BarChart data={techData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cerradas" stackId="a" fill="#00C49F" />
            <Bar dataKey="pendientes" stackId="a" fill="#ecea4c" />
            <Bar dataKey="canceladas" stackId="a" fill="#f11b14" />
          </BarChart>
        </ResponsiveContainer>

        <h2>Órdenes cerradas por agentes</h2>
        <ResponsiveContainer width="100%" height={300} id="agent-chart">
          <BarChart data={agentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="closed" radius={[5,5,0,0]}>
              {agentData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColorByName(entry.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="pie-charts">
          <div className="pie-container">
            <h2>Órdenes abiertas / cerradas</h2>
            <ResponsiveContainer width="100%" height={260} id="status-chart">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={createPieLabel(totalStatusOrders)}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pie-container">
            <h2>Órdenes cerradas por zona</h2>
            <div id="zone-chart" className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={closedByZoneData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={createPieLabel(closedByZoneData.reduce((a,b)=>a+b.value,0))}
                  >
                    {closedByZoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pie-container">
            <h2>Tipos de visitas</h2>
            <ResponsiveContainer width="100%" height={260} id="type-chart">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={createPieLabel(totalTypeVisits)}
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h2>Efectividad de técnicos (órdenes sin reporte)</h2>

        <div id="tech-effectiveness-chart">
        <ResponsiveContainer
          width="100%"
          height={Math.max(techEffectiveness.length * 55, 220)}
        >
          <BarChart
            data={techEffectiveness}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 120, bottom: 20 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" />
            
            {/* Eje X numérico */}
            <XAxis type="number" allowDecimals={false} />

            {/* Eje Y con técnicos */}
            <YAxis
              type="category"
              dataKey="name"
              width={100}
            />

            {/* Tooltip completo */}
            <Tooltip
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload;

                return (
                  <div style={{
                    background: "#fff",
                    border: "1px solid #ddd",
                    padding: "8px",
                    borderRadius: "6px"
                  }}>
                    <strong>{d.name}</strong>
                    <p>Total órdenes: {d.total}</p>
                    <p>Con problemas: {d.problems}</p>
                    <p>Sin problemas: {d.ok}</p>
                    <p>Efectividad: {d.effectiveness}%</p>
                  </div>
                );
              }}
            />

            {/* TOTAL DE ÓRDENES */}
            <Bar
              dataKey="total"
              name="Total de órdenes"
              fill="#9ca3af"
              barSize={16}
              radius={[0, 6, 6, 0]}
            />

            {/* ÓRDENES CON PROBLEMAS */}
            <Bar
              dataKey="problems"
              name="Órdenes con problemas"
              barSize={16}
              radius={[0, 6, 6, 0]}
            >
              {techEffectiveness.map((t, i) => (
                <Cell
                  key={i}
                  fill={getEffectivenessColor(t.effectiveness)}
                />
              ))}
            </Bar>

          </BarChart>
        </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

