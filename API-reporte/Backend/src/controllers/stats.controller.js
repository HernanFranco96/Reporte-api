// controllers/stats.controller.js
import Order from "../models/Order.js";
import { getCurrentWeekRange } from "../utils/date.js";

// Total de visitas por técnico en la semana, diferenciando estado
export const getTopTechnicians = async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      const range = getCurrentWeekRange();
      from = range.from.toISOString();
      to = range.to.toISOString();
    }

    const data = await Order.aggregate([
    {
      $addFields: {
        lastVisit: { $arrayElemAt: ["$visits", -1] }
      }
    },
    {
      $match: {
        lastVisit: { $ne: null },
        "lastVisit.visitDate": { $gte: new Date(from), $lte: new Date(to) }
      }
    },
    {
      $group: {
        _id: "$lastVisit.technician",
        cerradas: {
          $sum: { $cond: [{ $eq: ["$lastVisit.status", "Cerrada"] }, 1, 0] }
        },
        pendientes: {
          $sum: { $cond: [{ $eq: ["$lastVisit.status", "Pendiente"] }, 1, 0] }
        },
        canceladas: {
          $sum: { $cond: [{ $eq: ["$lastVisit.status", "Cancelada"] }, 1, 0] }
        }
      }
    },
    { $sort: { cerradas: -1 } },
    { $limit: 10 }
  ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Agentes que más cerraron órdenes
export const getTopAgents = async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      const range = getCurrentWeekRange();
      from = range.from.toISOString();
      to = range.to.toISOString();
    }

    const topAgents = await Order.aggregate([
      { $addFields: { lastVisit: { $arrayElemAt: ["$visits", -1] } } },

      // Filtrar solo visitas cerradas dentro del rango de fechas
      {
        $match: {
          "lastVisit.status": { $regex: /^cerrada$/i },
          "lastVisit.visitDate": { $gte: new Date(from), $lte: new Date(to) }
        }
      },

      {
        $group: {
          _id: "$lastVisit.closedBy",
          closedOrders: { $sum: 1 }
        }
      },
      { $sort: { closedOrders: -1 } },
      { $limit: 10 }
    ]);

    res.json(topAgents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Órdenes abiertas / cerradas en un rango de fechas
export const getOrderStatusSummary = async (req, res) => {
  let { from, to } = req.query;

  if (!from || !to) {
    const range = getCurrentWeekRange();
    from = range.from;
    to = range.to;
  } else {
    from = new Date(from);
    to = new Date(to);
  }

  try {
    const result = await Order.aggregate([
      {
        $addFields: {
          lastVisit: { $arrayElemAt: ["$visits", -1] }
        }
      },
      {
        $match: {
          lastVisit: { $ne: null },
          "lastVisit.visitDate": { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: "$lastVisit.status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Tipos de visitas
export const getVisitTypes = async (req, res) => {
  let { from, to } = req.query;

  if (!from || !to) {
    const range = getCurrentWeekRange();
    from = range.from.toISOString();
    to = range.to.toISOString();
  }

  try {
    const visitTypes = await Order.aggregate([
      {
        $addFields: {
          lastVisit: { $arrayElemAt: ["$visits", -1] }
        }
      },
      {
        $match: {
          lastVisit: { $ne: null },
          "lastVisit.visitDate": { $gte: new Date(from), $lte: new Date(to) }
        }
      },
      {
        $group: {
          _id: "$lastVisit.type",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json(visitTypes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getAvgWeeklyVisitsByTechnician = async (req, res) => {
  const { from, to } = req.query;

  try {
    const result = await Order.aggregate([
      // Desarmar visitas
      { $unwind: "$visits" },

      // Filtrar por rango
      {
        $match: {
          "visits.visitDate": {
            $gte: new Date(from),
            $lte: new Date(to)
          }
        }
      },

      // Normalizar fecha (día)
      {
        $addFields: {
          visitDay: {
            $dateTrunc: {
              date: "$visits.visitDate",
              unit: "day"
            }
          }
        }
      },

      // Obtener semana ISO
      {
        $addFields: {
          week: { $isoWeek: "$visitDay" },
          year: { $isoWeekYear: "$visitDay" }
        }
      },

      // DEDUPLICACIÓN diaria
      // 1 técnico + 1 orden + 1 día = 1 visita
      {
        $group: {
          _id: {
            technician: "$visits.technician",
            orderId: "$_id",
            visitDay: "$visitDay",
            year: "$year",
            week: "$week"
          }
        }
      },

      // Contar visitas únicas por semana
      {
        $group: {
          _id: {
            technician: "$_id.technician",
            year: "$_id.year",
            week: "$_id.week"
          },
          visitsInWeek: { $sum: 1 }
        }
      },

      // Promedio semanal por técnico
      {
        $group: {
          _id: "$_id.technician",
          avgWeeklyVisits: { $avg: "$visitsInWeek" },
          weeksCounted: { $sum: 1 }
        }
      },

      // Formato final
      {
        $project: {
          _id: 1,
          avgWeeklyVisits: { $round: ["$avgWeeklyVisits", 2] },
          weeksCounted: 1
        }
      },

      { $sort: { avgWeeklyVisits: -1 } }
    ]);

    res.json(result);
  } catch (err) {
    console.error("Error promedio semanal por técnico:", err);
    res.status(500).json({ message: err.message });
  }
};

