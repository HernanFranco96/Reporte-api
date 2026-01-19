// routes/stats.routes.js
import { Router } from "express";
import { 
    getTopTechnicians, 
    getTopAgents, 
    getOrderStatusSummary, 
    getVisitTypes, 
    getAvgWeeklyVisitsByTechnician
 } from "../controllers/stats.controller.js";
 import { authRequired } from "../middlewares/auth.middleware.js";


const router = Router();

router.get("/technicians", authRequired, getTopTechnicians);
router.get("/agents", authRequired, getTopAgents);
router.get("/orders/status", authRequired, getOrderStatusSummary);
router.get("/visits/types", authRequired, getVisitTypes);
router.get("/resolution/getAvgWeeklyVisitsByTechnician", authRequired, getAvgWeeklyVisitsByTechnician);

export default router;
