import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, Gender, LabResultType } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo@1234";

const staffSeed: Array<{
  email: string;
  role: Role;
  name: string;
  employeeCode: string;
  designation: string;
  specialization?: string;
  departmentName?: string;
}> = [
  {
    email: "admin@medicore.local",
    role: Role.ADMIN,
    name: "Admin User",
    employeeCode: "EMP-ADMIN",
    designation: "System Administrator",
  },
  {
    email: "doctor@medicore.local",
    role: Role.DOCTOR,
    name: "Dr. Sarah Khan",
    employeeCode: "EMP-DOC-001",
    designation: "Consultant Physician",
    specialization: "Internal Medicine",
    departmentName: "General Medicine",
  },
  {
    email: "cardio@medicore.local",
    role: Role.DOCTOR,
    name: "Dr. Ahmed Khan",
    employeeCode: "EMP-DOC-002",
    designation: "Cardiologist",
    specialization: "Cardiology",
    departmentName: "Cardiology",
  },
  {
    email: "ortho@medicore.local",
    role: Role.DOCTOR,
    name: "Dr. Hassan Raza",
    employeeCode: "EMP-DOC-003",
    designation: "Orthopedic Surgeon",
    specialization: "Orthopedics",
    departmentName: "Orthopedics",
  },
  {
    email: "pulmo@medicore.local",
    role: Role.DOCTOR,
    name: "Dr. Nadia Hassan",
    employeeCode: "EMP-DOC-004",
    designation: "Pulmonologist",
    specialization: "Pulmonology",
    departmentName: "Pulmonology",
  },
  {
    email: "nurse@medicore.local",
    role: Role.NURSE,
    name: "Ayesha Ali",
    employeeCode: "EMP-NUR-001",
    designation: "Registered Nurse",
  },
  {
    email: "receptionist@medicore.local",
    role: Role.RECEPTIONIST,
    name: "Bilal Ahmed",
    employeeCode: "EMP-REC-001",
    designation: "Front Desk",
  },
  {
    email: "pharmacist@medicore.local",
    role: Role.PHARMACIST,
    name: "Omar Farooq",
    employeeCode: "EMP-PHAR-001",
    designation: "Pharmacist",
  },
  {
    email: "lab@medicore.local",
    role: Role.LAB_TECHNICIAN,
    name: "Nadia Hussain",
    employeeCode: "EMP-LAB-001",
    designation: "Lab Technician",
  },
  {
    email: "billing@medicore.local",
    role: Role.BILLING_OFFICER,
    name: "Sana Iqbal",
    employeeCode: "EMP-BILL-001",
    designation: "Billing Officer",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const department = await prisma.department.upsert({
    where: { name: "General Medicine" },
    update: {},
    create: {
      name: "General Medicine",
      description: "Primary care and general clinical services",
    },
  });

  const laboratoryDept = await prisma.department.upsert({
    where: { name: "Laboratory" },
    update: {},
    create: {
      name: "Laboratory",
      description: "Clinical laboratory and diagnostics",
    },
  });

  const clinicalDepartments = [
    { name: "Cardiology", description: "Heart and cardiovascular care" },
    { name: "Pulmonology", description: "Respiratory and lung care" },
    { name: "Gastroenterology", description: "Digestive system care" },
    { name: "Dermatology", description: "Skin care" },
    { name: "Orthopedics", description: "Bones, joints, and injury care" },
    { name: "Mental Health", description: "Behavioral and mental health care" },
    {
      name: "Obstetrics & Gynecology",
      description: "Women's health and maternity care",
    },
    { name: "Surgery", description: "Surgical services" },
    { name: "Critical Care", description: "Intensive and critical care" },
  ] as const;

  const deptByName: Record<string, string> = {
    "General Medicine": department.id,
    Laboratory: laboratoryDept.id,
  };

  for (const d of clinicalDepartments) {
    const row = await prisma.department.upsert({
      where: { name: d.name },
      update: { description: d.description },
      create: { name: d.name, description: d.description },
    });
    deptByName[d.name] = row.id;
  }

  const symptomCategories = [
    {
      name: "General / Other",
      description: "General concerns or unsure which specialty fits",
      department: "General Medicine",
    },
    {
      name: "Chest Pain / Cardiac Concerns",
      description: "Chest discomfort, palpitations, or heart-related worries",
      department: "Cardiology",
    },
    {
      name: "Fever / Infection / Respiratory",
      description: "Fever, cough, breathing, or infection concerns",
      department: "Pulmonology",
    },
    {
      name: "Digestive Issues",
      description: "Stomach, bowel, or digestive concerns",
      department: "Gastroenterology",
    },
    {
      name: "Skin Issues",
      description: "Rashes, lesions, or other skin concerns",
      department: "Dermatology",
    },
    {
      name: "Orthopedic / Injury",
      description: "Joint pain, sprains, fractures, or musculoskeletal injury",
      department: "Orthopedics",
    },
    {
      name: "Mental Health",
      description: "Mood, stress, anxiety, or mental wellness concerns",
      department: "Mental Health",
    },
    {
      name: "Women's Health",
      description: "Gynecologic or pregnancy-related concerns",
      department: "Obstetrics & Gynecology",
    },
  ] as const;

  for (const cat of symptomCategories) {
    const suggestedDepartmentId = deptByName[cat.department];
    if (!suggestedDepartmentId) continue;
    const existing = await prisma.symptomCategory.findFirst({
      where: { name: cat.name },
    });
    if (existing) {
      await prisma.symptomCategory.update({
        where: { id: existing.id },
        data: {
          description: cat.description,
          suggestedDepartmentId,
        },
      });
    } else {
      await prisma.symptomCategory.create({
        data: {
          name: cat.name,
          description: cat.description,
          suggestedDepartmentId,
        },
      });
    }
  }

  for (const staff of staffSeed) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        passwordHash,
        role: staff.role,
        name: staff.name,
        isActive: true,
      },
      create: {
        email: staff.email,
        passwordHash,
        role: staff.role,
        name: staff.name,
        isActive: true,
      },
    });

    const staffDeptId =
      staff.role === Role.LAB_TECHNICIAN
        ? laboratoryDept.id
        : staff.departmentName && deptByName[staff.departmentName]
          ? deptByName[staff.departmentName]!
          : department.id;

    await prisma.staff.upsert({
      where: { userId: user.id },
      update: {
        employeeCode: staff.employeeCode,
        departmentId: staffDeptId,
        designation: staff.designation,
        specialization: staff.specialization ?? null,
        isActive: true,
      },
      create: {
        userId: user.id,
        employeeCode: staff.employeeCode,
        departmentId: staffDeptId,
        designation: staff.designation,
        specialization: staff.specialization ?? null,
      },
    });

    if (staff.role === Role.DOCTOR) {
      const doctorStaff = await prisma.staff.findUniqueOrThrow({
        where: { userId: user.id },
      });
      await prisma.staffAvailability.deleteMany({ where: { staffId: doctorStaff.id } });
      // Mon–Fri clinic hours for demo booking / queue smoke tests
      for (const dayOfWeek of [1, 2, 3, 4, 5]) {
        await prisma.staffAvailability.create({
          data: {
            staffId: doctorStaff.id,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
            slotDurationMins: 15,
          },
        });
      }
    }
  }

  const patientUser = await prisma.user.upsert({
    where: { email: "patient@medicore.local" },
    update: {
      passwordHash,
      role: Role.PATIENT,
      name: "Fatima Noor",
      isActive: true,
    },
    create: {
      email: "patient@medicore.local",
      passwordHash,
      role: Role.PATIENT,
      name: "Fatima Noor",
      isActive: true,
    },
  });

  await prisma.patient.upsert({
    where: { mrn: "MRN-DEMO-0001" },
    update: {
      userId: patientUser.id,
      firstName: "Fatima",
      lastName: "Noor",
      email: patientUser.email,
    },
    create: {
      userId: patientUser.id,
      mrn: "MRN-DEMO-0001",
      firstName: "Fatima",
      lastName: "Noor",
      dob: new Date("1990-05-15"),
      gender: Gender.FEMALE,
      phone: "+920000000001",
      email: patientUser.email,
    },
  });

  const medicines = [
    { name: "Paracetamol", genericName: "Acetaminophen", form: "tablet", strength: "500mg" },
    { name: "Ibuprofen", genericName: "Ibuprofen", form: "tablet", strength: "400mg" },
    { name: "Amoxicillin", genericName: "Amoxicillin", form: "capsule", strength: "500mg" },
    { name: "Azithromycin", genericName: "Azithromycin", form: "tablet", strength: "250mg" },
    { name: "Metformin", genericName: "Metformin", form: "tablet", strength: "500mg" },
    { name: "Amlodipine", genericName: "Amlodipine", form: "tablet", strength: "5mg" },
    { name: "Atorvastatin", genericName: "Atorvastatin", form: "tablet", strength: "20mg" },
    { name: "Omeprazole", genericName: "Omeprazole", form: "capsule", strength: "20mg" },
    { name: "Cetirizine", genericName: "Cetirizine", form: "tablet", strength: "10mg" },
    { name: "Salbutamol", genericName: "Albuterol", form: "inhaler", strength: "100mcg" },
    { name: "Losartan", genericName: "Losartan", form: "tablet", strength: "50mg" },
    { name: "Levothyroxine", genericName: "Levothyroxine", form: "tablet", strength: "50mcg" },
    { name: "Ciprofloxacin", genericName: "Ciprofloxacin", form: "tablet", strength: "500mg" },
    { name: "Diclofenac", genericName: "Diclofenac", form: "tablet", strength: "50mg" },
    { name: "ORS", genericName: "Oral rehydration salts", form: "sachet", strength: "1 sachet" },
    { name: "Insulin Glargine", genericName: "Insulin glargine", form: "injection", strength: "100U/mL" },
    { name: "Prednisolone", genericName: "Prednisolone", form: "tablet", strength: "5mg" },
    { name: "Clopidogrel", genericName: "Clopidogrel", form: "tablet", strength: "75mg" },
    { name: "Vitamin D3", genericName: "Cholecalciferol", form: "capsule", strength: "1000 IU" },
    { name: "Normal Saline", genericName: "Sodium chloride", form: "infusion", strength: "0.9%" },
  ];

  for (const med of medicines) {
    const existing = await prisma.medicine.findFirst({
      where: { name: med.name, strength: med.strength },
    });
    if (!existing) {
      await prisma.medicine.create({ data: med });
    }
  }

  // Patient-facing sell price: ~1.4× a representative unit cost (Task 10).
  const allMeds = await prisma.medicine.findMany({ include: { batches: true } });
  for (let i = 0; i < allMeds.length; i++) {
    const med = allMeds[i]!;
    if (med.sellingPriceCents > 0) continue;
    const cost =
      med.batches[0]?.unitCostCents ??
      150 + (i % 8) * 25;
    await prisma.medicine.update({
      where: { id: med.id },
      data: { sellingPriceCents: Math.round(cost * 1.4) },
    });
  }

  const suppliers = [
    {
      name: "MediSupply Pakistan",
      contactPerson: "Hassan Raza",
      phone: "+9203001112222",
      email: "orders@medisupply.example",
    },
    {
      name: "PharmaLink Distributors",
      contactPerson: "Sana Iqbal",
      phone: "+9203003334444",
      email: "desk@pharmalink.example",
    },
    {
      name: "CareChem Wholesale",
      contactPerson: "Usman Tariq",
      phone: "+9203005556666",
      email: "sales@carechem.example",
    },
  ];

  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.supplier.create({ data: s });
  }

  const catalog = await prisma.medicine.findMany({ take: 8, orderBy: { name: "asc" } });
  const now = new Date();
  for (let i = 0; i < catalog.length; i++) {
    const med = catalog[i]!;
    const batchSpecs = [
      {
        batchNo: `B-${med.name.slice(0, 3).toUpperCase()}-NEAR`,
        quantityInStock: i === 0 ? 5 : 40,
        unitCostCents: 150 + i * 25,
        expiryDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      },
      {
        batchNo: `B-${med.name.slice(0, 3).toUpperCase()}-FAR`,
        quantityInStock: 80,
        unitCostCents: 140 + i * 25,
        expiryDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
    ];
    for (const spec of batchSpecs) {
      const exists = await prisma.medicineBatch.findFirst({
        where: { medicineId: med.id, batchNo: spec.batchNo },
      });
      if (!exists) {
        await prisma.medicineBatch.create({
          data: { medicineId: med.id, ...spec },
        });
      }
    }
    // First medicine gets low stock for alert demos (threshold default 10)
    if (i === 0) {
      await prisma.medicine.update({
        where: { id: med.id },
        data: { reorderThreshold: 50 },
      });
    }
  }

  const labTests = [
    {
      name: "Complete Blood Count (CBC)",
      category: "Hematology",
      priceCents: 120000,
      sampleType: "Whole blood",
      turnaroundHours: 4,
      resultType: LabResultType.TEXT,
    },
    {
      name: "Hemoglobin",
      category: "Hematology",
      priceCents: 40000,
      sampleType: "Whole blood",
      turnaroundHours: 2,
      resultType: LabResultType.NUMERIC,
      unit: "g/dL",
      referenceLow: 12,
      referenceHigh: 16,
      criticalLow: 7,
      criticalHigh: 20,
    },
    {
      name: "Blood Glucose (Fasting)",
      category: "Chemistry",
      priceCents: 35000,
      sampleType: "Serum",
      turnaroundHours: 2,
      resultType: LabResultType.NUMERIC,
      unit: "mg/dL",
      referenceLow: 70,
      referenceHigh: 99,
      criticalLow: 40,
      criticalHigh: 400,
    },
    {
      name: "Serum Potassium",
      category: "Chemistry",
      priceCents: 45000,
      sampleType: "Serum",
      turnaroundHours: 2,
      resultType: LabResultType.NUMERIC,
      unit: "mmol/L",
      referenceLow: 3.5,
      referenceHigh: 5.0,
      criticalLow: 2.5,
      criticalHigh: 6.5,
    },
    {
      name: "Serum Sodium",
      category: "Chemistry",
      priceCents: 45000,
      sampleType: "Serum",
      turnaroundHours: 2,
      resultType: LabResultType.NUMERIC,
      unit: "mmol/L",
      referenceLow: 135,
      referenceHigh: 145,
      criticalLow: 120,
      criticalHigh: 160,
    },
    {
      name: "Creatinine",
      category: "Chemistry",
      priceCents: 50000,
      sampleType: "Serum",
      turnaroundHours: 3,
      resultType: LabResultType.NUMERIC,
      unit: "mg/dL",
      referenceLow: 0.6,
      referenceHigh: 1.3,
      criticalLow: 0.2,
      criticalHigh: 5,
    },
    {
      name: "Lipid Panel",
      category: "Chemistry",
      priceCents: 150000,
      sampleType: "Serum",
      turnaroundHours: 6,
      resultType: LabResultType.TEXT,
    },
    {
      name: "LDL Cholesterol",
      category: "Chemistry",
      priceCents: 60000,
      sampleType: "Serum",
      turnaroundHours: 4,
      resultType: LabResultType.NUMERIC,
      unit: "mg/dL",
      referenceLow: 0,
      referenceHigh: 100,
      criticalHigh: 250,
    },
    {
      name: "TSH",
      category: "Endocrine",
      priceCents: 90000,
      sampleType: "Serum",
      turnaroundHours: 8,
      resultType: LabResultType.NUMERIC,
      unit: "mIU/L",
      referenceLow: 0.4,
      referenceHigh: 4.0,
      criticalLow: 0.05,
      criticalHigh: 30,
    },
    {
      name: "HbA1c",
      category: "Chemistry",
      priceCents: 80000,
      sampleType: "Whole blood",
      turnaroundHours: 6,
      resultType: LabResultType.NUMERIC,
      unit: "%",
      referenceLow: 4,
      referenceHigh: 5.6,
      criticalHigh: 14,
    },
    {
      name: "Urinalysis",
      category: "Urine",
      priceCents: 50000,
      sampleType: "Urine",
      turnaroundHours: 3,
      resultType: LabResultType.TEXT,
    },
    {
      name: "CRP",
      category: "Immunology",
      priceCents: 70000,
      sampleType: "Serum",
      turnaroundHours: 4,
      resultType: LabResultType.NUMERIC,
      unit: "mg/L",
      referenceLow: 0,
      referenceHigh: 5,
      criticalHigh: 100,
    },
    {
      name: "Blood Culture",
      category: "Microbiology",
      priceCents: 200000,
      sampleType: "Whole blood",
      turnaroundHours: 48,
      resultType: LabResultType.TEXT,
    },
    {
      name: "Chest X-Ray Report",
      category: "Imaging",
      priceCents: 180000,
      sampleType: "N/A",
      turnaroundHours: 12,
      resultType: LabResultType.FILE,
    },
    {
      name: "ECG Report File",
      category: "Cardiology",
      priceCents: 100000,
      sampleType: "N/A",
      turnaroundHours: 2,
      resultType: LabResultType.FILE,
    },
  ];

  for (const test of labTests) {
    const existing = await prisma.labTestCatalog.findFirst({ where: { name: test.name } });
    if (!existing) {
      await prisma.labTestCatalog.create({ data: test });
    }
  }

  const surgeryDept = await prisma.department.upsert({
    where: { name: "Surgery" },
    update: {},
    create: {
      name: "Surgery",
      description: "Surgical wards and post-operative care",
    },
  });

  const icuDept = await prisma.department.upsert({
    where: { name: "Critical Care" },
    update: {},
    create: {
      name: "Critical Care",
      description: "ICU and high-dependency beds",
    },
  });

  const wardDefs: Array<{
    name: string;
    departmentId: string;
    floor: number;
    beds: Array<{ bedNumber: string; bedType: string; dailyRateCents: number }>;
  }> = [
    {
      name: "General Ward A",
      departmentId: department.id,
      floor: 2,
      beds: [
        { bedNumber: "A-101", bedType: "General", dailyRateCents: 350000 },
        { bedNumber: "A-102", bedType: "General", dailyRateCents: 350000 },
        { bedNumber: "A-103", bedType: "General", dailyRateCents: 350000 },
        { bedNumber: "A-104", bedType: "Private", dailyRateCents: 750000 },
        { bedNumber: "A-105", bedType: "Private", dailyRateCents: 750000 },
        { bedNumber: "A-106", bedType: "General", dailyRateCents: 350000 },
      ],
    },
    {
      name: "Surgical Ward B",
      departmentId: surgeryDept.id,
      floor: 3,
      beds: [
        { bedNumber: "B-201", bedType: "General", dailyRateCents: 450000 },
        { bedNumber: "B-202", bedType: "General", dailyRateCents: 450000 },
        { bedNumber: "B-203", bedType: "Private", dailyRateCents: 900000 },
        { bedNumber: "B-204", bedType: "Private", dailyRateCents: 900000 },
        { bedNumber: "B-205", bedType: "General", dailyRateCents: 450000 },
        { bedNumber: "B-206", bedType: "General", dailyRateCents: 450000 },
      ],
    },
    {
      name: "ICU",
      departmentId: icuDept.id,
      floor: 4,
      beds: [
        { bedNumber: "ICU-01", bedType: "ICU", dailyRateCents: 2500000 },
        { bedNumber: "ICU-02", bedType: "ICU", dailyRateCents: 2500000 },
        { bedNumber: "ICU-03", bedType: "ICU", dailyRateCents: 2500000 },
        { bedNumber: "ICU-04", bedType: "ICU", dailyRateCents: 2500000 },
        { bedNumber: "ICU-05", bedType: "ICU", dailyRateCents: 2500000 },
        { bedNumber: "ICU-06", bedType: "ICU", dailyRateCents: 2500000 },
      ],
    },
  ];

  for (const wardDef of wardDefs) {
    let ward = await prisma.ward.findFirst({ where: { name: wardDef.name } });
    if (!ward) {
      ward = await prisma.ward.create({
        data: {
          name: wardDef.name,
          departmentId: wardDef.departmentId,
          floor: wardDef.floor,
        },
      });
    }
    for (const bed of wardDef.beds) {
      const existingBed = await prisma.bed.findFirst({
        where: { wardId: ward.id, bedNumber: bed.bedNumber },
      });
      if (!existingBed) {
        await prisma.bed.create({
          data: {
            wardId: ward.id,
            bedNumber: bed.bedNumber,
            bedType: bed.bedType,
            dailyRateCents: bed.dailyRateCents,
            status: "AVAILABLE",
          },
        });
      }
    }
  }

  // Non-pharmacy inventory + equipment (Task 11)
  const inventorySeed: Array<{
    name: string;
    category: string;
    departmentId: string;
    unit: string;
    reorderThreshold: number;
    currentStock: number;
  }> = [
    { name: "Nitrile gloves (M)", category: "PPE", departmentId: department.id, unit: "box", reorderThreshold: 20, currentStock: 8 },
    { name: "Surgical masks", category: "PPE", departmentId: department.id, unit: "box", reorderThreshold: 15, currentStock: 40 },
    { name: "Alcohol swabs", category: "Consumable", departmentId: department.id, unit: "pack", reorderThreshold: 25, currentStock: 12 },
    { name: "IV cannulas 20G", category: "Consumable", departmentId: department.id, unit: "box", reorderThreshold: 10, currentStock: 30 },
    { name: "Bed linens set", category: "Linen", departmentId: department.id, unit: "set", reorderThreshold: 12, currentStock: 5 },
    { name: "Suture kit", category: "Surgical", departmentId: surgeryDept.id, unit: "kit", reorderThreshold: 8, currentStock: 3 },
    { name: "Sterile drapes", category: "Surgical", departmentId: surgeryDept.id, unit: "pack", reorderThreshold: 10, currentStock: 22 },
    { name: "Scalpel blades #10", category: "Surgical", departmentId: surgeryDept.id, unit: "box", reorderThreshold: 6, currentStock: 15 },
    { name: "Blood collection tubes", category: "Lab", departmentId: laboratoryDept.id, unit: "box", reorderThreshold: 20, currentStock: 9 },
    { name: "Pipette tips", category: "Lab", departmentId: laboratoryDept.id, unit: "box", reorderThreshold: 15, currentStock: 50 },
    { name: "Reagent alcohol 70%", category: "Lab", departmentId: laboratoryDept.id, unit: "bottle", reorderThreshold: 8, currentStock: 4 },
    { name: "Specimen bags", category: "Lab", departmentId: laboratoryDept.id, unit: "pack", reorderThreshold: 10, currentStock: 28 },
    { name: "ECG electrodes", category: "ICU", departmentId: icuDept.id, unit: "pack", reorderThreshold: 12, currentStock: 6 },
    { name: "Oxygen nasal cannula", category: "ICU", departmentId: icuDept.id, unit: "unit", reorderThreshold: 15, currentStock: 40 },
    { name: "Suction catheters", category: "ICU", departmentId: icuDept.id, unit: "box", reorderThreshold: 10, currentStock: 18 },
  ];

  for (const item of inventorySeed) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: item.name, departmentId: item.departmentId },
    });
    if (!existing) {
      await prisma.inventoryItem.create({ data: item });
    }
  }

  const equipmentNow = new Date();
  const equipmentSeed: Array<{
    name: string;
    departmentId: string;
    serialNo: string;
    status: "OPERATIONAL" | "MAINTENANCE" | "RETIRED";
    lastServicedAt?: Date;
    nextServiceDueAt?: Date;
  }> = [
    {
      name: "Defibrillator",
      departmentId: icuDept.id,
      serialNo: "EQ-DEF-001",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 90 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 5 * 86400000),
    },
    {
      name: "Ventilator",
      departmentId: icuDept.id,
      serialNo: "EQ-VENT-002",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 60 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 120 * 86400000),
    },
    {
      name: "Infusion pump",
      departmentId: department.id,
      serialNo: "EQ-INF-003",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 30 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 150 * 86400000),
    },
    {
      name: "ECG machine",
      departmentId: department.id,
      serialNo: "EQ-ECG-004",
      status: "MAINTENANCE",
      lastServicedAt: new Date(equipmentNow.getTime() - 10 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() - 2 * 86400000),
    },
    {
      name: "Surgical light",
      departmentId: surgeryDept.id,
      serialNo: "EQ-LIGHT-005",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 120 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 60 * 86400000),
    },
    {
      name: "Anesthesia machine",
      departmentId: surgeryDept.id,
      serialNo: "EQ-ANES-006",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 45 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 90 * 86400000),
    },
    {
      name: "Centrifuge",
      departmentId: laboratoryDept.id,
      serialNo: "EQ-CENT-007",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 20 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() - 1 * 86400000),
    },
    {
      name: "Chemistry analyzer",
      departmentId: laboratoryDept.id,
      serialNo: "EQ-CHEM-008",
      status: "OPERATIONAL",
      lastServicedAt: new Date(equipmentNow.getTime() - 15 * 86400000),
      nextServiceDueAt: new Date(equipmentNow.getTime() + 180 * 86400000),
    },
  ];

  for (const eq of equipmentSeed) {
    await prisma.equipment.upsert({
      where: { serialNo: eq.serialNo },
      update: {
        name: eq.name,
        departmentId: eq.departmentId,
        status: eq.status,
        lastServicedAt: eq.lastServicedAt ?? null,
        nextServiceDueAt: eq.nextServiceDueAt ?? null,
      },
      create: eq,
    });
  }

  const settingDefaults: Record<string, unknown> = {
    "hospital.name": "MediCore",
    "hospital.address": null,
    "hospital.logoUrl": null,
    "hospital.brandColorHex": "#1a5cd6",
    "hospital.contactEmail": null,
    "billing.consultationFeeCents": 5000,
    "billing.defaultSurgeryFeeCents": 150000,
    "billing.nursingDailyCents": 0,
    "billing.taxRatePercent": 0,
    "billing.currency": "USD",
    "features.patientSelfRegistration": true,
    "features.appointmentWaitlist": true,
    "appointment.pendingHoldHours": 4,
  };

  for (const [key, value] of Object.entries(settingDefaults)) {
    await prisma.hospitalSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }

  const radiologyModalities = [
    { name: "X-Ray", code: "XR", priceCents: 8000 },
    { name: "Ultrasound", code: "US", priceCents: 12000 },
    { name: "CT", code: "CT", priceCents: 25000 },
    { name: "MRI", code: "MRI", priceCents: 45000 },
  ] as const;

  for (const modality of radiologyModalities) {
    await prisma.radiologyModality.upsert({
      where: { code: modality.code },
      update: {
        name: modality.name,
        priceCents: modality.priceCents,
      },
      create: modality,
    });
  }

  console.log(
    "Seed complete: demo users, medicines, pharmacy stock, lab catalog, wards/beds, inventory/equipment, settings, symptom categories, radiology modalities",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
