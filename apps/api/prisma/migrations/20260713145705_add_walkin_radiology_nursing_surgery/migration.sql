-- CreateEnum
CREATE TYPE "RadiologyOrderStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyItemStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'REPORTED');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SurgeryUrgency" AS ENUM ('ELECTIVE', 'URGENT', 'EMERGENCY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceSourceType" ADD VALUE 'RADIOLOGY';
ALTER TYPE "InvoiceSourceType" ADD VALUE 'SURGERY';

-- AlterTable
ALTER TABLE "Admission" ADD COLUMN     "carePlan" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queueNumber" INTEGER;

-- CreateTable
CREATE TABLE "NursingNote" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "prescriptionItemId" TEXT,
    "medicineName" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "givenBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyModality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RadiologyModality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyOrder" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "orderedBy" TEXT NOT NULL,
    "status" "RadiologyOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyOrderItem" (
    "id" TEXT NOT NULL,
    "radiologyOrderId" TEXT NOT NULL,
    "modalityId" TEXT NOT NULL,
    "status" "RadiologyItemStatus" NOT NULL DEFAULT 'ORDERED',
    "invoicedAt" TIMESTAMP(3),

    CONSTRAINT "RadiologyOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyReport" (
    "id" TEXT NOT NULL,
    "radiologyOrderItemId" TEXT NOT NULL,
    "findings" TEXT,
    "impression" TEXT,
    "reportFileUrl" TEXT,
    "enteredBy" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "urgency" "SurgeryUrgency" NOT NULL DEFAULT 'ELECTIVE',
    "status" "SurgeryStatus" NOT NULL DEFAULT 'REQUESTED',
    "feeCents" INTEGER,
    "orRoom" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "primarySurgeonId" TEXT,
    "scheduleNotes" TEXT,
    "operativeNotes" TEXT,
    "invoicedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgeryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NursingNote_admissionId_idx" ON "NursingNote"("admissionId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_admissionId_idx" ON "MedicationAdministration"("admissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyModality_name_key" ON "RadiologyModality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyModality_code_key" ON "RadiologyModality"("code");

-- CreateIndex
CREATE INDEX "RadiologyOrderItem_radiologyOrderId_idx" ON "RadiologyOrderItem"("radiologyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyReport_radiologyOrderItemId_key" ON "RadiologyReport"("radiologyOrderItemId");

-- CreateIndex
CREATE INDEX "SurgeryRequest_patientId_idx" ON "SurgeryRequest"("patientId");

-- CreateIndex
CREATE INDEX "SurgeryRequest_status_idx" ON "SurgeryRequest"("status");

-- AddForeignKey
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrderItem" ADD CONSTRAINT "RadiologyOrderItem_radiologyOrderId_fkey" FOREIGN KEY ("radiologyOrderId") REFERENCES "RadiologyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrderItem" ADD CONSTRAINT "RadiologyOrderItem_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "RadiologyModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_radiologyOrderItemId_fkey" FOREIGN KEY ("radiologyOrderItemId") REFERENCES "RadiologyOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryRequest" ADD CONSTRAINT "SurgeryRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryRequest" ADD CONSTRAINT "SurgeryRequest_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryRequest" ADD CONSTRAINT "SurgeryRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryRequest" ADD CONSTRAINT "SurgeryRequest_primarySurgeonId_fkey" FOREIGN KEY ("primarySurgeonId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
