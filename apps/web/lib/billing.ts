export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID";

export type InvoiceListRow = {
  id: string;
  status: InvoiceStatus;
  totalCents: number;
  createdAt: string;
  issuedAt?: string | null;
  patient?: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  _count?: { items: number; payments: number };
};

export type InvoiceDetail = {
  id: string;
  patientId: string;
  status: InvoiceStatus;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  voidReason?: string | null;
  issuedAt?: string | null;
  createdAt: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    insuranceProvider?: string | null;
    insurancePolicyNo?: string | null;
  };
  items: Array<{
    id: string;
    sourceType: string;
    sourceId?: string | null;
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    transactionRef?: string | null;
    paidAt: string;
    recordedBy: string;
  }>;
  claims: Array<{
    id: string;
    provider: string;
    policyNo: string;
    claimedCents: number;
    status: string;
    submittedAt: string;
  }>;
};

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
