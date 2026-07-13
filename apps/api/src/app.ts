import "dotenv/config";
import http from "http";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma";
import { initSocket } from "./lib/socket";
import { authenticate } from "./middleware/authenticate";
import { withRequestContext } from "./middleware/withRequestContext";
import appointmentRoutes from "./modules/appointments/appointments.routes";
import encounterRoutes from "./modules/encounters/encounters.routes";
import labRoutes from "./modules/lab/lab.routes";
import medicineRoutes from "./modules/medicines/medicines.routes";
import patientRoutes from "./modules/patients/patients.routes";
import pharmacyRoutes from "./modules/pharmacy/pharmacy.routes";
import staffRoutes from "./modules/staff/staff.routes";
import { admissionsRouter, wardsRouter } from "./modules/wards/wards.routes";
import billingRoutes from "./modules/billing/billing.routes";
import {
  equipmentRoutes,
  inventoryRoutes,
} from "./modules/inventory/inventory.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import auditRoutes from "./modules/audit/audit.routes";
import {
  departmentsRoutes,
  settingsRoutes,
  usersRoutes,
} from "./modules/settings/settings.routes";
import publicRoutes from "./modules/public/public.routes";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.set("trust proxy", 1);

app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(withRequestContext);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: "ok",
      dbConnected: true,
      userCount,
    });
  } catch {
    res.status(503).json({
      status: "error",
      dbConnected: false,
      userCount: 0,
    });
  }
});

app.get("/health/me", authenticate, (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    staffId: req.user!.staffId ?? null,
    patientId: req.user!.patientId ?? null,
    departmentId: req.user!.departmentId ?? null,
  });
});

app.use("/api/patients", patientRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/wards", wardsRouter);
app.use("/api/admissions", admissionsRouter);
app.use("/api/billing", billingRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/public", publicRoutes);

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`MediCore API listening on http://localhost:${port}`);
});

export default app;
