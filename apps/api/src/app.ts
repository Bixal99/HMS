import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

import { auditMiddleware } from "./middleware/audit.middleware";

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global Audit Logging
app.use(auditMiddleware);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import patientRoutes from "./modules/patients/patient.routes";
import staffRoutes from "./modules/staff/staff.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import emrRoutes from "./modules/emr/emr.routes";
import pharmacyRoutes from "./modules/pharmacy/pharmacy.routes";
import billingRoutes from "./modules/billing/billing.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import wardRoutes from "./modules/wards/ward.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import auditRoutes from "./modules/audit/audit.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";

// ─── API Routes (will be added per module) ────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/records", emrRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
// ... more routes added as modules are implemented

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🏥 MediCore API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${config.NODE_ENV}`);
});

export default app;
