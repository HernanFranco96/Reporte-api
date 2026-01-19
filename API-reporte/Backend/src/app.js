import express from "express";
import cors from "cors";
import ordersRoutes from "./routes/orders.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import authRoutes from "./routes/auth.routes.js"
import usersRoutes from "./routes/users.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orders", ordersRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

export default app;
