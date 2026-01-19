import { Router } from "express";
import { createUser } from "../controllers/users.controller.js";
import { authRequired, adminOnly } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", createUser);

export default router;
