import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";

export type Actions = "manage" | "create" | "read" | "update" | "delete";
export type Subjects =
  | "all"
  | "Patient"
  | "PatientAllergy"
  | "PatientDocument"
  | "Staff"
  | "StaffAvailability"
  | "StaffLeaveRequest"
  | "Encounter"
  | "Vitals"
  | "Diagnosis"
  | "Prescription"
  | "Medicine"
  | "MedicineBatch"
  | "Dispense"
  | "PurchaseOrder"
  | "Supplier"
  | "Appointment"
  | "Invoice"
  | "InvoiceItem"
  | "Payment"
  | "InsuranceClaim"
  | "LabResult"
  | "LabOrder"
  | "LabOrderItem"
  | "LabTestCatalog"
  | "Ward"
  | "Bed"
  | "Admission"
  | "BedTransfer"
  | "InventoryItem"
  | "InventoryTransaction"
  | "Equipment"
  | "OperationalReport"
  | "FinancialReport"
  | "ClinicalReport"
  | "ReportSnapshot"
  | "AuditLog"
  | "HospitalSetting"
  | "Department"
  | "User";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export const BILLING_PATIENT_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "mrn",
  "insuranceProvider",
  "insurancePolicyNo",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cond = any;

export function defineAbilitiesFor(user: {
  role: string;
  id: string;
  staffId?: string | null;
  patientId?: string | null;
  departmentId?: string | null;
}): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (user.role) {
    case "ADMIN":
      can("manage", "all");
      can("read", "AuditLog");
      cannot(["create", "update", "delete"], "Encounter");
      break;

    case "RECEPTIONIST":
      can(["create", "read", "update"], "Patient");
      cannot("delete", "Patient");
      can(["create", "read"], "PatientDocument");
      can("read", "Staff");
      can("read", "StaffAvailability");
      can(["create", "read", "update"], "Appointment");
      can("read", "Invoice");
      can("create", "Payment");
      break;

    case "DOCTOR":
      can("read", "Patient");
      can(["create", "read"], "PatientAllergy");
      can(["create", "read"], "PatientDocument");
      can("manage", "StaffAvailability");
      can(["create", "read"], "StaffLeaveRequest");
      if (user.staffId) {
        can("manage", "Encounter", { doctorId: user.staffId } as Cond);
        can("manage", "Prescription", { doctorId: user.staffId } as Cond);
        can("read", "Appointment", { doctorId: user.staffId } as Cond);
        can("update", "Appointment", { doctorId: user.staffId } as Cond);
        can("create", "LabOrder");
        can("read", "LabOrder", { orderedBy: user.staffId } as Cond);
        can("read", "LabResult", { orderedBy: user.staffId } as Cond);
      }
      can(["create", "read"], "Vitals");
      can("manage", "Diagnosis");
      can("read", "Medicine");
      can("read", "LabTestCatalog");
      can("read", "Ward");
      can("read", "Bed");
      can(["create", "read"], "Admission");
      can("update", "Admission", ["dischargedAt", "dischargeSummary"]);
      can("read", "ClinicalReport");
      can("create", "ReportSnapshot");
      break;

    case "NURSE":
      can("read", "Patient");
      can(["create", "read"], "PatientAllergy");
      can("manage", "StaffAvailability");
      can(["create", "read"], "StaffLeaveRequest");
      can("read", "Appointment");
      can("update", "Appointment", ["status"]);
      can("read", "Encounter");
      can(["create", "read"], "Vitals");
      cannot(["create", "update"], "Diagnosis");
      cannot(["create", "update"], "Prescription");
      can("read", "Ward");
      can("read", "Bed");
      can("read", "Admission");
      can("create", "Admission");
      can("manage", "BedTransfer");
      can("update", "Bed", ["status"]);
      if (user.departmentId) {
        can("read", "InventoryItem", { departmentId: user.departmentId } as Cond);
        can("create", "InventoryTransaction");
      }
      break;

    case "PHARMACIST":
      can("manage", "StaffAvailability");
      can(["create", "read"], "StaffLeaveRequest");
      can("read", "Medicine");
      can("manage", "MedicineBatch");
      can("manage", "Dispense");
      can("manage", "PurchaseOrder");
      can("manage", "Supplier");
      can(["read", "update"], "Prescription");
      break;

    case "LAB_TECHNICIAN":
      can("manage", "StaffAvailability");
      can(["create", "read"], "StaffLeaveRequest");
      can("read", "LabTestCatalog");
      can("manage", "LabOrder");
      can("manage", "LabOrderItem");
      can("manage", "LabResult");
      cannot("update", "LabResult", ["verifiedAt", "verifiedBy"]);
      if (user.departmentId) {
        can("read", "InventoryItem", { departmentId: user.departmentId } as Cond);
        can("read", "Equipment", { departmentId: user.departmentId } as Cond);
        can("update", "Equipment", { departmentId: user.departmentId } as Cond);
      }
      break;

    case "BILLING_OFFICER":
      can("read", "Patient");
      can("read", "Admission");
      can("manage", "Invoice");
      can("manage", "InvoiceItem");
      can("manage", "Payment");
      can("manage", "InsuranceClaim");
      can("read", "FinancialReport");
      can("create", "ReportSnapshot");
      break;

    case "PATIENT":
      can(["read", "update"], "Patient");
      if (user.patientId) {
        can("read", "Invoice", { patientId: user.patientId } as Cond);
        can("read", "Payment", { patientId: user.patientId } as Cond);
        cannot("create", "Payment");
        can(["create", "read"], "Appointment", { patientId: user.patientId } as Cond);
        can("update", "Appointment", {
          patientId: user.patientId,
          status: "SCHEDULED",
        } as Cond);
        can("read", "Encounter", { patientId: user.patientId } as Cond);
        can("read", "Vitals", { patientId: user.patientId } as Cond);
        can("read", "Diagnosis", { patientId: user.patientId } as Cond);
        can("read", "Prescription", { patientId: user.patientId } as Cond);
        can("read", "LabResult");
      }
      break;

    default:
      break;
  }

  return build();
}

export function pickBillingPatientFields<T extends Record<string, unknown>>(patient: T) {
  const result: Record<string, unknown> = {};
  for (const key of BILLING_PATIENT_FIELDS) {
    if (key in patient) {
      result[key] = patient[key];
    }
  }
  return result;
}
