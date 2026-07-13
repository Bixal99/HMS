export type PatientAllergy = {
  id: string;
  allergen: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
  notes?: string | null;
  createdAt: string;
};

export type PatientDocument = {
  id: string;
  fileUrl: string;
  docType: string;
  uploadedBy: string;
  createdAt: string;
};

export type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  bloodGroup?: string;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  emergencyRelation?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNo?: string | null;
  allergies?: PatientAllergy[];
  documents?: PatientDocument[];
};

export type PatientListResponse = {
  data: Patient[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PatientTimeline = {
  patientId: string;
  registeredAt: string;
  appointments: unknown[];
  encounters: unknown[];
  invoices: Array<{
    id: string;
    status: string;
    totalCents: number;
    createdAt: string;
    issuedAt?: string | null;
  }>;
};

export function ageFromDob(dob: string | Date): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function bloodGroupLabel(value?: string) {
  const map: Record<string, string> = {
    A_POS: "A+",
    A_NEG: "A-",
    B_POS: "B+",
    B_NEG: "B-",
    AB_POS: "AB+",
    AB_NEG: "AB-",
    O_POS: "O+",
    O_NEG: "O-",
    UNKNOWN: "Unknown",
  };
  return map[value ?? "UNKNOWN"] ?? value ?? "Unknown";
}
