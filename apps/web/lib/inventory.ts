export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  departmentId: string;
  unit: string;
  reorderThreshold: number;
  currentStock: number;
  department: { id: string; name: string };
};

export type EquipmentRow = {
  id: string;
  name: string;
  departmentId: string;
  serialNo: string;
  status: "OPERATIONAL" | "MAINTENANCE" | "RETIRED";
  lastServicedAt?: string | null;
  nextServiceDueAt?: string | null;
  department: { id: string; name: string };
};

export const REASON_CODES = [
  "RECEIVED",
  "USED",
  "DAMAGED",
  "EXPIRED",
  "MISCOUNT",
  "OTHER",
] as const;
