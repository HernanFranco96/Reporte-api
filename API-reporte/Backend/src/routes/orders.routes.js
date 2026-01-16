// routes/orders.routes.js
import { Router } from "express";
import { getOrder, getOrders, getOrderHistory, saveOrder, addVisit } from "../controllers/orders.controller.js";

const router = Router();

router.get("/", getOrders);
router.get("/:id", getOrder);
router.post("/save", saveOrder);
router.put("/:id/visit", addVisit);
router.get("/:id/history", getOrderHistory);

export default router;
