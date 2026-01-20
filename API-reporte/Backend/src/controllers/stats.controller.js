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

// Órdenes cerradas por zona en un rango de fechas
export const getClosedOrdersByZone = async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      const range = getCurrentWeekRange();
      from = range.from.toISOString();
      to = range.to.toISOString();
    }

    const data = await Order.aggregate([
      // Tomamos la última visita
      { $addFields: { lastVisit: { $arrayElemAt: ["$visits", -1] } } },

      // Filtramos solo órdenes cerradas dentro del rango según fecha de cierre
      {
        $match: {
          "lastVisit.status": { $regex: /^cerrada$/i },
          "lastVisit.closeDate": { $gte: new Date(from), $lte: new Date(to) }
        }
      },

      // Agrupamos por zona (o "Sin zona" si no existe)
      {
        $group: {
          _id: { $ifNull: ["$lastVisit.zona", "Sin zona"] },
          count: { $sum: 1 }
        }
      }
    ]);

    // Asegurar siempre que las dos zonas aparezcan aunque tengan 0
    const zones = ["Florencio Varela", "Quilmes"];
    const result = zones.map(z => {
      const found = data.find(d => d._id === z);
      return { _id: z, count: found ? found.count : 0 };
    });

    res.json(result);
  } catch (err) {
    console.error("Error getClosedOrdersByZone:", err);
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

      // Filtrar visitas dentro del rango
      {
        $match: {
          "visits.visitDate": {
            $gte: new Date(from),
            $lte: new Date(to)
          }
        }
      },

      // Obtener semana ISO
      {
        $addFields: {
          visitDay: {
            $dateTrunc: { date: "$visits.visitDate", unit: "day" }
          }
        }
      },
      {
        $addFields: {
          week: { $isoWeek: "$visitDay" },
          year: { $isoWeekYear: "$visitDay" }
        }
      },

      // Agrupar por técnico + orden + semana
      {
        $group: {
          _id: {
            technician: "$visits.technician",
            orderId: "$_id",
            year: "$year",
            week: "$week"
          },
          // Si ALGUNA visita tuvo reportCode → problema
          hasProblem: {
            $max: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$visits.reportCode", null] },
                    { $ne: ["$visits.reportCode", ""] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },

      // Contar órdenes por semana
      {
        $group: {
          _id: {
            technician: "$_id.technician",
            year: "$_id.year",
            week: "$_id.week"
          },
          totalOrders: { $sum: 1 },
          ordersWithProblem: { $sum: "$hasProblem" }
        }
      },

      // Consolidar por técnico
      {
        $group: {
          _id: "$_id.technician",
          totalOrders: { $sum: "$totalOrders" },
          ordersWithProblem: { $sum: "$ordersWithProblem" }
        }
      },

      // Calcular efectividad
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          ordersWithProblem: 1,
          effectiveness: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: ["$totalOrders", 0] },
                      0,
                      {
                        $divide: [
                          { $subtract: ["$totalOrders", "$ordersWithProblem"] },
                          "$totalOrders"
                        ]
                      }
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      },

      { $sort: { effectiveness: -1 } }
    ]);

    res.json(result);
  } catch (err) {
    console.error("Error efectividad semanal por técnico:", err);
    res.status(500).json({ message: err.message });
  }
};
