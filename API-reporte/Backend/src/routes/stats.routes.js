// routes/stats.routes.js
import { Router } from "express";
import { 
    getTopTechnicians, 
    getTopAgents, 
    getOrderStatusSummary, 
    getVisitTypes, 
    getAvgResolutionByTechnician
 } from "../controllers/stats.controller.js";

const router = Router();

router.get("/technicians", getTopTechnicians);
router.get("/agents", getTopAgents);
router.get("/orders/status", getOrderStatusSummary);
router.get("/visits/types", getVisitTypes);
router.get("/resolution/getAvgResolutionByTechnician", getAvgResolutionByTechnician);

export default router;
