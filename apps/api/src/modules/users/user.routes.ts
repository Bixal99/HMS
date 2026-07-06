import { Router } from "express";
import { UserController } from "./user.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.get("/me", requireAuth, UserController.getMe);

export default router;
