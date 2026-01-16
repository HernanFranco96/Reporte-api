import express from "express";
import cors from "cors";
import ordersRoutes from "./routes/orders.routes.js";
import statsRoutes from "./routes/stats.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orders", ordersRoutes);
app.use("/api/stats", statsRoutes);

export default app;
