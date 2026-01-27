// models/Order.js
import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    status: String,
    type: String,
    technician: String,
    closedBy: String,
    observation: {
      type: String,
      required: true,
      trim: true
    },
    zona: {
      type: String,
      enum: ["Florencio Varela", "Quilmes", "La Colorada"],
      required: true
    },
    reportCode: String,
    reportStatus: String,
    visitDate: Date,
    closeDate: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    clientNumber: {
      type: String,
      required: true,
      index: true
    },

    reportedToUfinet: {
      type: Boolean,
      default: false
    },

    visits: {
      type: [visitSchema],
      validate: v => v.length > 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
