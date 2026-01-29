// routes/stats.routes.js
import { Router } from "express";
import { 
    getTopTechnicians, 
    getTopAgents, 
    getClosedOrdersByZone,
    getOrderStatusSummary, 
    getVisitTypes, 
    getProblemOrdersByTechnician,
    getAvgWeeklyVisitsByTechnician
 } from "../controllers/stats.controller.js";
 import { authRequired } from "../middlewares/auth.middleware.js";
 import { getOrdersByDayAndStatus, getClosedOrdersForReport } from "../controllers/orders.controller.js";

const router = Router();

router.get("/technicians", authRequired, getTopTechnicians);
router.get("/agents", authRequired, getTopAgents);
router.get("/orders/closed-by-zone", getClosedOrdersByZone);
router.get("/orders-by-day", authRequired, getOrdersByDayAndStatus)
router.get("/orders/status", authRequired, getOrderStatusSummary);
router.get("/visits/types", authRequired, getVisitTypes);
router.get("/resolution/technician-effectiveness", authRequired, getAvgWeeklyVisitsByTechnician);
router.get("/problems-by-technician", authRequired, getProblemOrdersByTechnician);
router.get("/reportWeek", authRequired, getClosedOrdersForReport)

export default router;
