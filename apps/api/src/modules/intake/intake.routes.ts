import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  createPatientIntakeHandler,
  createSymptomCategoryHandler,
  getPatientIntakeHandler,
  listSymptomCategoriesHandler,
  recommendHandler,
  updatePatientIntakeHandler,
  updateSymptomCategoryHandler,
} from "./intake.controller";

export const symptomCategoriesRoutes = Router();
symptomCategoriesRoutes.use(authenticate);
symptomCategoriesRoutes.get(
  "/",
  authorize("PATIENT", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"),
  listSymptomCategoriesHandler,
);
symptomCategoriesRoutes.get(
  "/recommend",
  authorize("PATIENT", "ADMIN", "RECEPTIONIST"),
  recommendHandler,
);

export const adminSymptomCategoriesRoutes = Router();
adminSymptomCategoriesRoutes.use(authenticate);
adminSymptomCategoriesRoutes.post(
  "/",
  authorize("ADMIN"),
  createSymptomCategoryHandler,
);
adminSymptomCategoriesRoutes.patch(
  "/:id",
  authorize("ADMIN"),
  updateSymptomCategoryHandler,
);

export const patientIntakeRoutes = Router();
patientIntakeRoutes.use(authenticate);
patientIntakeRoutes.post("/", authorize("PATIENT"), createPatientIntakeHandler);
patientIntakeRoutes.get(
  "/:id",
  authorize("PATIENT", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"),
  getPatientIntakeHandler,
);
patientIntakeRoutes.patch(
  "/:id",
  authorize("PATIENT"),
  updatePatientIntakeHandler,
);
