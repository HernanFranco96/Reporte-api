import Order from "../models/Order.js";
import { getCurrentWeekRange } from "../utils/date.js"

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

export const getClosedOrdersByDay = async (req, res) => {
  try {
    let from, to; 

    if (!req.query.from || !req.query.to) {
      const range = getCurrentWeekRange(); // { from: Date, to: Date }
      from = new Date(range.from);
      to = new Date(range.to);
    } else {
      from = new Date(req.query.from);
      to = new Date(req.query.to);
    }

    // Ajustar horas para incluir todo el día
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    // Buscar solo la última visita cerrada
    const data = await Order.aggregate([
      // Filtrar solo visitas cerradas
      {
        $addFields: {
          closedVisits: {
            $filter: {
              input: "$visits",
              as: "v",
              cond: { $eq: ["$$v.status", "Cerrada"] }
            }
          }
        }
      },
      // Tomar la visita cerrada más reciente (según closeDate)
      {
        $addFields: {
          lastClosedVisit: {
            $arrayElemAt: [
              { $slice: [ { $reverseArray: { $sortArray: { input: "$closedVisits", sortBy: { closeDate: 1 } } } }, 1 ] },
              0
            ]
          }
        }
      },
      // Filtrar por rango de fechas
      {
        $match: {
          "lastClosedVisit.closeDate": { $gte: from, $lte: to }
        }
      },
      // Contar por día
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d",
              date: "$lastClosedVisit.closeDate",
              timezone: "America/Argentina/Buenos_Aires"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Generar todos los días del rango
    const allDays = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      allDays.push(`${yyyy}-${mm}-${dd}`);
    }

    const dataMap = {};
    data.forEach(d => { dataMap[d._id] = d.count; });

    const result = allDays.map(day => ({ date: day, count: dataMap[day] || 0 }));

    res.json(result);
  } catch (err) {
    console.error("Error getClosedOrdersByDay:", err);
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

