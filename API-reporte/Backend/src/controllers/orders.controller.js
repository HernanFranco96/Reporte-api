import Order from "../models/Order.js";
import { getCurrentWeekRanges } from "../utils/date.js"

export const getOrder = async (req, res) => {
    try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export const getOrders = async (req, res) => {
  try {
    const { technician, type, from, to, zona } = req.query;

    const filter = {};

    // FILTRO POR FECHA DE VISITA
    if (from || to) {
      filter.visits = {
        $elemMatch: {
          ...(from && { visitDate: { $gte: new Date(from + "T00:00:00.000Z") } }),
          ...(to && {
            visitDate: {
              ...(from ? {} : { $exists: true }),
              $lte: new Date(to + "T23:59:59.999Z")
            }
          })
        }
      };
    }

    // FILTROS OPCIONALES SOBRE VISITAS
    if (technician) {
      filter.visits = {
        ...(filter.visits || {}),
        $elemMatch: {
          ...(filter.visits?.$elemMatch || {}),
          technician
        }
      };
    }

    if (type) {
      filter.visits = {
        ...(filter.visits || {}),
        $elemMatch: {
          ...(filter.visits?.$elemMatch || {}),
          type
        }
      };
    }

    // FILTRO POR ZONA (ahora sí)
    if (zona) {
      filter.zona = zona;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("❌ Error getOrders:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getClosedOrdersForReport = async (req, res) => {
  const { from, to } = req.query;

  const orders = await Order.aggregate([
    { $addFields: { lastVisit: { $arrayElemAt: ["$visits", -1] } } },
    {
      $match: {
        "lastVisit.status": { $regex: /^cerrada$/i },
        "lastVisit.closeDate": {
          $gte: new Date(from + "T00:00:00.000Z"),
          $lte: new Date(to + "T23:59:59.999Z")
        }
      }
    }
  ]);

  res.json(orders);
};

export const getOrdersByDayAndStatus = async (req, res) => {
  try {
    let from, to;

    if (!req.query.from || !req.query.to) {
      const range = getCurrentWeekRanges();
      from = new Date(range.from);
      to = new Date(range.to);
    } else {
      from = new Date(req.query.from);
      to = new Date(req.query.to);
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const data = await Order.aggregate([
      // 1️⃣ Desarmar visitas
      { $unwind: "$visits" },

      // 2️⃣ Normalizar fecha efectiva
      {
        $addFields: {
          visitStatus: "$visits.status",
          visitDate: {
            $ifNull: ["$visits.closeDate", "$visits.visitDate"]
          }
        }
      },

      // 3️⃣ Filtrar por rango
      {
        $match: {
          visitDate: { $gte: from, $lte: to }
        }
      },

      // 4️⃣ Ordenar visitas por orden + fecha
      {
        $sort: {
          _id: 1,
          visitDate: 1
        }
      },

      // 5️⃣ Detectar cambio de estado
      {
        $setWindowFields: {
          partitionBy: "$_id",
          sortBy: { visitDate: 1 },
          output: {
            prevStatus: {
              $shift: {
                output: "$visitStatus",
                by: -1
              }
            }
          }
        }
      },

      // 6️⃣ Quedarse solo con cambios de estado
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ["$prevStatus", null] },       // primer estado
              { $ne: ["$visitStatus", "$prevStatus"] } // cambio real
            ]
          }
        }
      },

      // 7️⃣ Agrupar por día + estado
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$visitDate",
                timezone: "America/Argentina/Buenos_Aires"
              }
            },
            status: "$visitStatus"
          },
          count: { $sum: 1 }
        }
      },

      { $sort: { "_id.date": 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Error getOrdersByDayAndStatus:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id, {
      clientNumber: 1,
      visits: 1,
      createdAt: 1
    });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo historial" });
  }
};

export const saveOrder = async (req, res) => {
  try {
    const { observation, zona, ...visitData } = req.body;

    if (!zona) {
      return res.status(400).json({ message: "La zona es obligatoria" });
    }

    if (!observation?.trim()) {
      return res.status(400).json({ message: "La observación es obligatoria" });
    }

    const order = await Order.create({
      clientNumber: req.body.clientNumber,
      reportedToUfinet: req.body.reportedToUfinet,
      visits: [
        {
          ...visitData,
          observation,
          zona,
          visitDate: visitData.visitDate ? new Date(visitData.visitDate) : undefined,
          closeDate: visitData.closeDate ? new Date(visitData.closeDate) : undefined
        }
      ]
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const addVisit = async (req, res) => {
  try {
    const { observation, zona, ...visitData } = req.body;

    if (!observation?.trim()) {
      return res.status(400).json({ message: "La observación es obligatoria" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          reportedToUfinet: req.body.reportedToUfinet,
        },
        $push: {
          visits: {
            ...visitData,
            observation,
            zona,
            visitDate: visitData.visitDate ? new Date(visitData.visitDate) : undefined,
            closeDate: visitData.closeDate ? new Date(visitData.closeDate) : undefined
          }
        }
      },
      { new: true }
    );

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Error actualizando orden" });
  }
};

