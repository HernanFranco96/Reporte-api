// routes/orders.routes.js
import { Router } from "express";
import { 
    getOrder, 
    getOrders, 
    getOrderHistory, 
    saveOrder, 
    addVisit } from "../controllers/orders.controller.js";
import { authRequired } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authRequired, getOrders);
router.get("/:id", authRequired, getOrder);
router.post("/save", authRequired, saveOrder);
router.put("/:id/visit", authRequired, addVisit);
router.get("/:id/history", authRequired, getOrderHistory);

export default router;
