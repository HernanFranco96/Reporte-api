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

const calcVariation = (current, previous) => {
    if (!previous) return { diff: 0, pct: 0 };

    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);

    return { diff, pct };
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
  const [problemByTech, setProblemByTech] = useState([]);
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

  
  const techVar = calcVariation(totalTechVisits, prevTechTotal);
  const agentVar = calcVariation(totalAgentClosed, prevAgentTotal);

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

    api.get("/stats/problems-by-technician", { params })
      .then(res => setProblemByTech(res.data))
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

const isDateInRange = (date, from, to) => {
  if (!date) return false;

  const d = toLocalDateString(date);
  return d >= from && d <= to;
};

const toLocalDateString = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};


// const getProblemRelevantDate = (visit) =>
//   visit.closeDate || visit.visitDate;

// const normalizeTech = (t) => t.trim().toLowerCase();

// const buildProblemRowsByTechnicianThisWeek = (orders, technicians) => {
//   const techMap = {}; // key normalizada → nombre visible

//   technicians.forEach(t => {
//     techMap[normalizeTech(t)] = t.trim();
//   });

//   const grouped = {};

//   orders.forEach(order => {
//     (order.visits || []).forEach(v => {
//       if (!v.reportCode || !v.reportCode.trim()) return;
//       if (!v.technician) return;

//       const techKey = normalizeTech(v.technician);
//       if (!techMap[techKey]) return;

//       const dateToCheck = getProblemRelevantDate(v);
//       if (!isDateInRange(dateToCheck, from, to)) return;

//       grouped[techKey] ??= {
//         name: techMap[techKey],
//         rows: []
//       };

//       grouped[techKey].rows.push({
//         technician: techMap[techKey],
//         client: order.clientNumber,
//         status: v.status || "-",
//         obs: `Reporte: ${v.reportCode}\n${v.observation || "-"}`,
//         visit: formatDate(v.visitDate),
//         close: v.closeDate ? formatDate(v.closeDate) : "-"
//       });
//     });
//   });

//   return grouped;
// };


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

      // const TECHNICIANS = [
      //     ...new Set(
      //       ordersRaw.flatMap(order =>
      //         (order.visits || [])
      //           .filter(v => v.reportCode && v.reportCode.trim())
      //           .map(v => v.technician?.trim())
      //           .filter(Boolean)
      //       )
      //     )
      //   ];

      // const groupedRows = buildProblemRowsByTechnicianThisWeek(
      //   ordersRaw,
      //   TECHNICIANS
      // );

      problemByTech.forEach(t => {
        y = drawTable(
          pdf,
          y,
          `Órdenes con problemas – ${t._id}`,
          t.orders.map(o => ({
            client: o.client,
            status: o.status,
            obs: `Reporte: ${o.reportCode}\n${o.obs}`,
            visit: formatDate(o.visit),
            close: o.close ? formatDate(o.close) : "-"
          }))
        );
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

  const parseLocalDate = (str) => {
    const [y, m, d] = str.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  // Función semana anterior
const getPreviousWeekRange = () => {
  const { from } = getCurrentWeekRangeFrontend();

  const start = parseLocalDate(from);
  start.setDate(start.getDate() - 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end)
  };
};

const getCurrentWeekRangeFrontend = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo

  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  return {
    from: formatLocalDate(sunday),
    to: formatLocalDate(saturday)
  };
};



  const formatLocalDate = (d) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const clearFilter = () => {
    const { from, to } = getCurrentWeekRangeFrontend();
    setFrom(from);
    setTo(to);
    fetchData(from, to);
  };

  useEffect(() => {
    if (location.state?.refresh) {
      const { from, to } = getCurrentWeekRangeFrontend();
      setFrom(from);
      setTo(to);
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

  const formattedData = (dailyClosedData || []).map(d => ({
    date: d.date,
    count: d.count
  }));

  const getEffectivenessColor = (value) => {
    if (value >= 80) return "#22c55e"; // verde
    if (value >= 50) return "#eab308"; // amarillo
    return "#ef4444";                 // rojo
  };

  const avgEffectivenessWeighted = techEffectiveness.reduce(
    (acc, t) => {
      acc.ok += t.ok;
      acc.total += t.total;
      return acc;
    },
    { ok: 0, total: 0 }
  );

  const effectiveness =
    avgEffectivenessWeighted.total
      ? Math.round(
          (avgEffectivenessWeighted.ok / avgEffectivenessWeighted.total) * 100
        )
      : 0;

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

      {/* KPIS */}
      <h2>Efectividad global (sin reporte)</h2>
      <section className="kpis">
        <div className="kpi success">
          <h4>Total visitas técnicas</h4>
          <span>{totalTechVisits}</span>

          {prevTechTotal > 0 && (
            <small className={techVar.diff >= 0 ? "up" : "down"}>
              {techVar.diff >= 0 ? "↑" : "↓"} {Math.abs(techVar.diff)} ({techVar.pct}%)
            </small>
          )}

        </div>

        <div className="kpi">
          <h4>Órdenes cerradas</h4>
          <span>{totalAgentClosed}</span>
        </div>

        <div className="kpi warning">
          <h4>Efectividad promedio</h4>
          <span>{effectiveness}%</span>
        </div>
      </section>

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
                width={10}
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

        <div className="grid-2">
          <div>
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
          </div>

          <div>
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
          </div>
        </div>

        <div className="pie-charts">
          <div className="pie-container">
            <h2>Órdenes abiertas / cerradas</h2>
            <div id="status-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pie-container">
            <h2>Órdenes cerradas por zona</h2>
              <div id="zone-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[...closedByZoneData].sort((a,b)=>b.value-a.value)}
                    layout="vertical"
                    margin={{ left: 70, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className="pie-container">
            <h2>Tipos de visitas</h2>
              <div id="type-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={typeData}
                    layout="vertical"
                    margin={{ left: 70, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </div>
        </div>
      </section>
    </div>
  );
}

