export enum Role {
  ADMIN = "ADMIN",
  DOCTOR = "DOCTOR",
  NURSE = "NURSE",
  RECEPTIONIST = "RECEPTIONIST",
  PHARMACIST = "PHARMACIST",
  LAB_TECHNICIAN = "LAB_TECHNICIAN",
  BILLING_OFFICER = "BILLING_OFFICER",
  PATIENT = "PATIENT",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export type User = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: string;
  name: string;
  description: string | null;
};

export type Staff = {
  id: string;
  userId: string;
  employeeCode: string;
  departmentId: string;
  designation: string;
  specialization: string | null;
  dateJoined: string;
  isActive: boolean;
};

export type Patient = {
  id: string;
  userId: string | null;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
