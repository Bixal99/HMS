// ─── User Roles ───────────────────────────────────────────────────────────────
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

// ─── Gender ───────────────────────────────────────────────────────────────────
export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

// ─── Appointment Status ───────────────────────────────────────────────────────
export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  CHECKED_IN = "CHECKED_IN",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

// ─── Encounter Status ─────────────────────────────────────────────────────────
export enum EncounterStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

// ─── Invoice Status ───────────────────────────────────────────────────────────
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  VOID = "VOID",
}

// ─── Prescription Status ──────────────────────────────────────────────────────
export enum PrescriptionStatus {
  PENDING = "PENDING",
  DISPENSED = "DISPENSED",
  PARTIALLY_DISPENSED = "PARTIALLY_DISPENSED",
  CANCELLED = "CANCELLED",
}

// ─── Lab Order Status ─────────────────────────────────────────────────────────
export enum LabOrderStatus {
  ORDERED = "ORDERED",
  COLLECTED = "COLLECTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ─── Bed Status ───────────────────────────────────────────────────────────────
export enum BedStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED",
  MAINTENANCE = "MAINTENANCE",
}

// ─── Leave Request Status ─────────────────────────────────────────────────────
export enum LeaveRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// ─── Payment Method ───────────────────────────────────────────────────────────
export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  INSURANCE = "INSURANCE",
  BANK_TRANSFER = "BANK_TRANSFER",
}

// ─── Inventory Transaction Type ───────────────────────────────────────────────
export enum InventoryTransactionType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
}

// ─── Equipment Status ─────────────────────────────────────────────────────────
export enum EquipmentStatus {
  OPERATIONAL = "OPERATIONAL",
  MAINTENANCE = "MAINTENANCE",
  RETIRED = "RETIRED",
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────
export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  staffId?: string;
  patientId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── User DTOs ────────────────────────────────────────────────────────────────
export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Input DTOs ───────────────────────────────────────────────────────────────
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterPatientInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  departmentId: string;
  designation: string;
  specialization?: string | null;
}
