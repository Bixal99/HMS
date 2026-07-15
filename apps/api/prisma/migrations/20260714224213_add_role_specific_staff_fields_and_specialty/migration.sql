-- DropIndex
DROP INDEX "Appointment_doctorId_scheduledAt_key";

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "consultationFeeCents" INTEGER,
ADD COLUMN     "consultationRoom" TEXT,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "shiftPattern" TEXT,
ADD COLUMN     "specialtyId" TEXT,
ADD COLUMN     "wardId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
