import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { medicinesSearchHandler } from "../encounters/encounters.controller";

const router = Router();

router.use(authenticate);
router.get("/search", authorize("DOCTOR", "ADMIN", "NURSE"), medicinesSearchHandler);

export default router;
