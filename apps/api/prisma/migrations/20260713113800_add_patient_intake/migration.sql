-- CreateEnum
CREATE TYPE "IntakeSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateTable
CREATE TABLE "SymptomCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "suggestedDepartmentId" TEXT NOT NULL,

    CONSTRAINT "SymptomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientIntake" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "symptomCategoryId" TEXT NOT NULL,
    "chiefComplaintText" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "severity" "IntakeSeverity" NOT NULL,
    "redFlagsSelected" JSONB NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "appointmentId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymptomCategory_suggestedDepartmentId_idx" ON "SymptomCategory"("suggestedDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientIntake_appointmentId_key" ON "PatientIntake"("appointmentId");

-- CreateIndex
CREATE INDEX "PatientIntake_patientId_idx" ON "PatientIntake"("patientId");

-- CreateIndex
CREATE INDEX "PatientIntake_symptomCategoryId_idx" ON "PatientIntake"("symptomCategoryId");

-- AddForeignKey
ALTER TABLE "SymptomCategory" ADD CONSTRAINT "SymptomCategory_suggestedDepartmentId_fkey" FOREIGN KEY ("suggestedDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientIntake" ADD CONSTRAINT "PatientIntake_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientIntake" ADD CONSTRAINT "PatientIntake_symptomCategoryId_fkey" FOREIGN KEY ("symptomCategoryId") REFERENCES "SymptomCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientIntake" ADD CONSTRAINT "PatientIntake_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
