import Order from "../models/Order.js";

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
    const { technician, type, from, to } = req.query;

    const filter = {};

    // FILTRO POR FECHA DE VISITA (NO createdAt)
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

    // FILTROS OPCIONALES
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

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    //console.log("📤 /api/orders órdenes encontradas:", orders.length);

    res.json(orders);
  } catch (err) {
    console.error("❌ Error getOrders:", err);
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
    const { observation, ...visitData } = req.body;

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
    const { observation, ...visitData } = req.body;

    if (!observation?.trim()) {
      return res.status(400).json({ message: "La observación es obligatoria" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          reportedToUfinet: req.body.reportedToUfinet
        },
        $push: {
          visits: {
            ...visitData,
            observation,
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

