import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  contactHandler,
  departmentsHandler,
  doctorsHandler,
  statsHandler,
} from "./public.controller";

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many contact requests. Try again later." },
});

const router = Router();

router.get("/departments", departmentsHandler);
router.get("/doctors", doctorsHandler);
router.get("/stats", statsHandler);
router.post("/contact", contactLimiter, contactHandler);

export default router;
