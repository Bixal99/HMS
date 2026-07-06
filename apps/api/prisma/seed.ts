import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive database seed...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Settings
  console.log("-> Seeding Settings...");
  await prisma.hospitalSetting.upsert({ where: { key: "HOSPITAL_NAME" }, update: {}, create: { key: "HOSPITAL_NAME", valueJson: "MediCore General Hospital" } });
  await prisma.hospitalSetting.upsert({ where: { key: "DEFAULT_TAX_RATE" }, update: {}, create: { key: "DEFAULT_TAX_RATE", valueJson: "5.5" } });
  await prisma.hospitalSetting.upsert({ where: { key: "CURRENCY_SYMBOL" }, update: {}, create: { key: "CURRENCY_SYMBOL", valueJson: "$" } });

  // 2. Departments
  console.log("-> Seeding Departments...");
  const cardiology = await prisma.department.upsert({
    where: { name: "Cardiology" }, update: {}, create: { name: "Cardiology", description: "Heart and blood vessels" }
  });
  const icu = await prisma.department.upsert({
    where: { name: "Intensive Care Unit" }, update: {}, create: { name: "Intensive Care Unit", description: "Critical care" }
  });
  const general = await prisma.department.upsert({
    where: { name: "General Medicine" }, update: {}, create: { name: "General Medicine", description: "General health" }
  });

  // 3. Users & Staff
  console.log("-> Seeding Users & Staff...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@medicore.com" }, update: {},
    create: { email: "admin@medicore.com", passwordHash, firstName: "Super", lastName: "Admin", role: "ADMIN", phone: "1234567890" }
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@medicore.com" }, update: {},
    create: { email: "doctor@medicore.com", passwordHash, firstName: "Gregory", lastName: "House", role: "DOCTOR", phone: "0987654321" }
  });
  const doctorStaff = await prisma.staff.upsert({
    where: { employeeCode: "DOC-001" }, update: {},
    create: { userId: doctorUser.id, employeeCode: "DOC-001", departmentId: general.id, designation: "Attending Physician", specialization: "Diagnostics" }
  });

  const nurseUser = await prisma.user.upsert({
    where: { email: "nurse@medicore.com" }, update: {},
    create: { email: "nurse@medicore.com", passwordHash, firstName: "Jackie", lastName: "Peyton", role: "NURSE", phone: "1112223333" }
  });
  await prisma.staff.upsert({
    where: { employeeCode: "NRS-001" }, update: {},
    create: { userId: nurseUser.id, employeeCode: "NRS-001", departmentId: icu.id, designation: "Head Nurse" }
  });

  const receptionUser = await prisma.user.upsert({
    where: { email: "reception@medicore.com" }, update: {},
    create: { email: "reception@medicore.com", passwordHash, firstName: "Pam", lastName: "Beesly", role: "RECEPTIONIST", phone: "5555555555" }
  });
  await prisma.staff.upsert({
    where: { employeeCode: "REC-001" }, update: {},
    create: { userId: receptionUser.id, employeeCode: "REC-001", departmentId: general.id, designation: "Front Desk" }
  });

  // 4. Wards & Beds
  console.log("-> Seeding Wards & Beds...");
  let icuWard = await prisma.ward.findFirst({ where: { name: "ICU Alpha" } });
  if (!icuWard) {
    icuWard = await prisma.ward.create({
      data: {
        name: "ICU Alpha", floor: 1, departmentId: icu.id,
        beds: {
          create: [
            { bedNumber: "ICU-101", status: "OCCUPIED", bedType: "ICU", dailyRate: 50000 },
            { bedNumber: "ICU-102", status: "AVAILABLE", bedType: "ICU", dailyRate: 50000 },
            { bedNumber: "ICU-103", status: "AVAILABLE", bedType: "ICU", dailyRate: 50000 },
            { bedNumber: "ICU-104", status: "MAINTENANCE", bedType: "ICU", dailyRate: 50000 },
            { bedNumber: "ICU-105", status: "AVAILABLE", bedType: "ICU", dailyRate: 50000 }
          ]
        }
      }
    });
  }

  // 5. Patients
  console.log("-> Seeding Patients...");
  const p1 = await prisma.patient.upsert({
    where: { mrn: "MRN-10001" }, update: {},
    create: { mrn: "MRN-10001", firstName: "John", lastName: "Doe", dob: new Date("1980-05-15"), gender: "MALE", bloodGroup: "O+", phone: "9998887777", address: "123 Main St" }
  });
  const p2 = await prisma.patient.upsert({
    where: { mrn: "MRN-10002" }, update: {},
    create: { mrn: "MRN-10002", firstName: "Jane", lastName: "Smith", dob: new Date("1992-11-20"), gender: "FEMALE", bloodGroup: "A-", phone: "6665554444", address: "456 Elm St" }
  });

  // 6. Admissions
  console.log("-> Seeding Admissions...");
  const occupiedBed = await prisma.bed.findFirst({ where: { bedNumber: "ICU-101" } });
  if (occupiedBed) {
    const existingAdmission = await prisma.admission.findFirst({ where: { bedId: occupiedBed.id } });
    if (!existingAdmission) {
      await prisma.admission.create({
        data: {
          patientId: p1.id, bedId: occupiedBed.id, admittedBy: doctorStaff.id
        }
      });
    }
  }

  // 7. Inventory
  console.log("-> Seeding Inventory...");
  const syr = await prisma.inventoryItem.findFirst({ where: { name: "10ml Syringes" } });
  if (!syr) {
    await prisma.inventoryItem.create({
      data: { name: "10ml Syringes", category: "Consumables", currentStock: 50, unit: "boxes", reorderThreshold: 20 }
    });
  }
  const msk = await prisma.inventoryItem.findFirst({ where: { name: "N95 Surgical Masks" } });
  if (!msk) {
    await prisma.inventoryItem.create({
      data: { name: "N95 Surgical Masks", category: "PPE", currentStock: 15, unit: "boxes", reorderThreshold: 50 }
    });
  }

  // 8. Appointments
  console.log("-> Seeding Appointments...");
  const existingAppt = await prisma.appointment.findFirst({ where: { patientId: p2.id } });
  if (!existingAppt) {
    await prisma.appointment.create({
      data: {
        patientId: p2.id, doctorId: doctorStaff.id, departmentId: general.id,
        scheduledAt: new Date(), reasonForVisit: "Annual checkup", status: "SCHEDULED", createdBy: adminUser.id
      }
    });
  }

  console.log("✅ Database successfully seeded!");
  console.log(`
  Credentials:
  - Admin:      admin@medicore.com / password123
  - Doctor:     doctor@medicore.com / password123
  - Nurse:      nurse@medicore.com / password123
  - Reception:  reception@medicore.com / password123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
