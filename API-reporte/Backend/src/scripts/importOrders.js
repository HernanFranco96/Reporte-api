import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { connectDB } from "../db/db.js";

const months = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
};

const parseDate = (value) => {
  if (!value) return null;

  const clean = value.trim().toLowerCase();
  if (!clean) return null;

  const match = clean.match(
    /^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})$/
  );

  if (!match) return null;

  const day = Number(match[1]);
  const month = months[match[2]];
  const year = Number(match[3]);

  if (month === undefined) return null;

  return new Date(year, month, day);
};

const normalize = (key) =>
  key
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

await connectDB();

const orders = [];

fs.createReadStream("Ordenes.csv")
  .pipe(csv())
  .on("data", (row) => {
    const normalizedRow = {};

    for (const key in row) {
      normalizedRow[normalize(key)] = row[key];
    }

    if (!normalizedRow["numero de cliente"]) return;

    orders.push({
      clientNumber: normalizedRow["numero de cliente"],
      status: normalizedRow["estado orden"],
      reportStatus: normalizedRow["estado reporte / accion"],
      type: normalizedRow["tipo"],
      technician: normalizedRow["tecnico"],
      closedBy: normalizedRow["cerrado por"] || null,
      reportedToUfinet:
        normalizedRow["reportado a ufinet"]?.toLowerCase() === "si",
      reportCode: normalizedRow["reporte / accion"] || null,
      observation: normalizedRow["observacion"],
      visitDate: parseDate(normalizedRow["fecha visita"]),
      closeDate: parseDate(normalizedRow["fecha cierre"])
    });
  })
  .on("end", async () => {
    try {
      await Order.insertMany(orders, { ordered: false });
      console.log(`✔ ${orders.length} órdenes importadas`);
    } catch (err) {
      console.error("❌ Error insertando órdenes", err);
    } finally {
      mongoose.disconnect();
    }
  });
