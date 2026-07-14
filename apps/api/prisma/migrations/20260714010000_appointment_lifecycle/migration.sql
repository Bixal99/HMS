-- Appointment lifecycle expansion: statuses, fields, events, partial unique slot hold

-- Expand AppointmentStatus via new enum swap
CREATE TYPE "AppointmentStatus_new" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'WAITING',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'NO_SHOW'
);

ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment"
  ALTER COLUMN "status" TYPE "AppointmentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'SCHEDULED' THEN 'CONFIRMED'
      WHEN 'IN_PROGRESS' THEN 'IN_CONSULTATION'
      ELSE "status"::text
    END
  )::"AppointmentStatus_new";

DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"AppointmentStatus";

CREATE TYPE "AppointmentPriority" AS ENUM ('LOW', 'NORMAL', 'URGENT', 'EMERGENCY');
CREATE TYPE "AppointmentSource" AS ENUM ('PATIENT_PORTAL', 'RECEPTION', 'PHONE', 'WALK_IN');
CREATE TYPE "AppointmentVisitType" AS ENUM ('NEW_PATIENT', 'FOLLOW_UP', 'ROUTINE');
CREATE TYPE "AppointmentEventType" AS ENUM (
  'APPOINTMENT_CREATED',
  'STATUS_CHANGED',
  'DOCTOR_ASSIGNED',
  'DOCTOR_CHANGED',
  'RESCHEDULE_REQUESTED',
  'RESCHEDULE_APPROVED',
  'ALTERNATIVE_OFFERED',
  'PATIENT_CHECKED_IN',
  'REMINDER_SENT',
  'PRIORITY_CHANGED'
);
CREATE TYPE "RejectionReasonCode" AS ENUM (
  'DOCTOR_UNAVAILABLE',
  'CLINIC_CLOSED',
  'DUPLICATE_BOOKING',
  'PATIENT_REQUESTED_CANCEL',
  'OTHER'
);

ALTER TABLE "Appointment"
  ADD COLUMN "priority" "AppointmentPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "appointmentSource" "AppointmentSource" NOT NULL DEFAULT 'RECEPTION',
  ADD COLUMN "visitType" "AppointmentVisitType" NOT NULL DEFAULT 'ROUTINE',
  ADD COLUMN "rejectionReasonCode" "RejectionReasonCode",
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "pendingExpiresAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" TEXT,
  ADD COLUMN "assignedDoctorAt" TIMESTAMP(3),
  ADD COLUMN "assignedDoctorById" TEXT,
  ADD COLUMN "offeredAlternatives" JSONB,
  ADD COLUMN "rescheduleRequestedAt" TIMESTAMP(3),
  ADD COLUMN "rescheduleRequestedSlot" TIMESTAMP(3),
  ADD COLUMN "rescheduleRequestedDoctorId" TEXT;

-- Existing rows were SCHEDULED → CONFIRMED; stamp confirmation for historical data
UPDATE "Appointment"
SET "confirmedAt" = "createdAt",
    "appointmentSource" = CASE WHEN "isWalkIn" THEN 'WALK_IN'::"AppointmentSource" ELSE 'RECEPTION'::"AppointmentSource" END
WHERE "status" = 'CONFIRMED' AND "confirmedAt" IS NULL;

ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_doctorId_scheduledAt_key";

CREATE UNIQUE INDEX "Appointment_doctorId_scheduledAt_blocking_key"
  ON "Appointment" ("doctorId", "scheduledAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION');

CREATE INDEX "Appointment_status_pendingExpiresAt_idx" ON "Appointment" ("status", "pendingExpiresAt");
CREATE INDEX "Appointment_status_priority_idx" ON "Appointment" ("status", "priority");

CREATE TABLE "AppointmentEvent" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "eventType" "AppointmentEventType" NOT NULL,
  "fromStatus" "AppointmentStatus",
  "toStatus" "AppointmentStatus",
  "actorUserId" TEXT,
  "note" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentEvent_appointmentId_createdAt_idx" ON "AppointmentEvent" ("appointmentId", "createdAt");

ALTER TABLE "AppointmentEvent"
  ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "HospitalSetting" ("id", "key", "value", "updatedAt")
VALUES (
  'a1000000-0000-4000-8000-000000000014',
  'appointment.pendingHoldHours',
  '4'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
