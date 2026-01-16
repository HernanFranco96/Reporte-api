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


export const getAvgResolutionByTechnician = async (req, res) => {
  const { from, to } = req.query;

  const match = {};
  if (from || to) match.createdAt = {};
  if (from) match.createdAt.$gte = new Date(from);
  if (to) match.createdAt.$lte = new Date(to);

  try {
    const match = {
      "visits.visitDate": { $gte: new Date(from), $lte: new Date(to) }
    };

    const result = await Order.aggregate([
      { $match: match },

      {
        $project: {
          visits: {
            $filter: {
              input: "$visits",
              as: "v",
              cond: { $eq: ["$$v.status", "Cerrada"] }
            }
          }
        }
      },

      { $match: { "visits.0": { $exists: true } } },

      {
        $addFields: {
          firstVisit: { $arrayElemAt: ["$visits", 0] },
          lastVisit: { $arrayElemAt: ["$visits", -1] }
        }
      },

      {
        $addFields: {
          technician: "$firstVisit.technician",
          resolutionMs: {
            $subtract: [
              "$lastVisit.closeDate",
              "$firstVisit.visitDate"
            ]
          }
        }
      },

      {
        $group: {
          _id: "$technician",
          avgResolutionMs: { $avg: "$resolutionMs" },
          ordersCount: { $sum: 1 }
        }
      },

      {
        $project: {
          avgHours: { $divide: ["$avgResolutionMs", 1000 * 60 * 60] },
          ordersCount: 1
        }
      },

      { $sort: { avgHours: 1 } }
    ]);
    res.json(result);
  } catch (err) {
    console.error("Error promedio por técnico:", err);
    res.status(500).json({ message: err.message });
  }
};
