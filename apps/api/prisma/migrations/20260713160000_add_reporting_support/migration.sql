-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "inProgressAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReportSnapshot_reportType_idx" ON "ReportSnapshot"("reportType");
CREATE INDEX IF NOT EXISTS "ReportSnapshot_generatedAt_idx" ON "ReportSnapshot"("generatedAt");
CREATE INDEX IF NOT EXISTS "ReportSnapshot_generatedBy_idx" ON "ReportSnapshot"("generatedBy");
