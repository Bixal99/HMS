import { prisma } from "../../lib/prisma";

export type FinancialReportParams = {
  start: Date;
  end: Date;
};

const CATEGORY_TYPES = ["CONSULTATION", "LAB", "PHARMACY", "BED", "OTHER"] as const;

/**
 * Financial reporting is scoped to non-void invoices issued within [start, end].
 * Invoices without an `issuedAt` (still DRAFT) are excluded — they have not
 * been billed yet, so including them would double count once they are issued.
 */
export async function getFinancialReport({ start, end }: FinancialReportParams) {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { not: "VOID" },
      issuedAt: { gte: start, lte: end },
    },
    include: {
      items: true,
      payments: true,
    },
  });

  const revenueByCategoryMap = new Map<string, number>(
    CATEGORY_TYPES.map((type) => [type, 0]),
  );
  const consultationEncounterIds = new Set<string>();
  const bedAdmissionIds = new Set<string>();

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      revenueByCategoryMap.set(
        item.sourceType,
        (revenueByCategoryMap.get(item.sourceType) ?? 0) + item.lineTotalCents,
      );
      if (item.sourceType === "CONSULTATION" && item.sourceId) {
        consultationEncounterIds.add(item.sourceId);
      }
      if (item.sourceType === "BED" && item.sourceId) {
        bedAdmissionIds.add(item.sourceId);
      }
    }
  }

  const revenueByCategory = CATEGORY_TYPES.map((type) => ({
    sourceType: type,
    revenueCents: revenueByCategoryMap.get(type) ?? 0,
  }));

  const [encounters, admissions] = await Promise.all([
    consultationEncounterIds.size
      ? prisma.encounter.findMany({
          where: { id: { in: Array.from(consultationEncounterIds) } },
          select: {
            id: true,
            doctor: { select: { department: { select: { id: true, name: true } } } },
          },
        })
      : Promise.resolve([]),
    bedAdmissionIds.size
      ? prisma.admission.findMany({
          where: { id: { in: Array.from(bedAdmissionIds) } },
          select: {
            id: true,
            bed: {
              select: { ward: { select: { department: { select: { id: true, name: true } } } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const encounterDeptMap = new Map(encounters.map((e) => [e.id, e.doctor.department]));
  const admissionDeptMap = new Map(admissions.map((a) => [a.id, a.bed.ward.department]));

  const consultationByDepartmentMap = new Map<string, { name: string; revenueCents: number }>();
  const bedByDepartmentMap = new Map<string, { name: string; revenueCents: number }>();

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      if (item.sourceType === "CONSULTATION" && item.sourceId) {
        const dept = encounterDeptMap.get(item.sourceId);
        if (dept) {
          const entry = consultationByDepartmentMap.get(dept.id) ?? {
            name: dept.name,
            revenueCents: 0,
          };
          entry.revenueCents += item.lineTotalCents;
          consultationByDepartmentMap.set(dept.id, entry);
        }
      }
      if (item.sourceType === "BED" && item.sourceId) {
        const dept = admissionDeptMap.get(item.sourceId);
        if (dept) {
          const entry = bedByDepartmentMap.get(dept.id) ?? {
            name: dept.name,
            revenueCents: 0,
          };
          entry.revenueCents += item.lineTotalCents;
          bedByDepartmentMap.set(dept.id, entry);
        }
      }
    }
  }

  const consultationByDepartment = Array.from(consultationByDepartmentMap.entries()).map(
    ([departmentId, v]) => ({
      departmentId,
      departmentName: v.name,
      revenueCents: v.revenueCents,
    }),
  );
  const bedByDepartment = Array.from(bedByDepartmentMap.entries()).map(([departmentId, v]) => ({
    departmentId,
    departmentName: v.name,
    revenueCents: v.revenueCents,
  }));

  const outstandingBalanceCents = invoices
    .filter((inv) => inv.status !== "PAID")
    .reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
      return sum + Math.max(0, inv.totalCents - paid);
    }, 0);

  const claims = await prisma.insuranceClaim.findMany({
    where: { submittedAt: { gte: start, lte: end } },
    select: { status: true },
  });
  const claimsByStatusMap = new Map<string, number>();
  for (const claim of claims) {
    claimsByStatusMap.set(claim.status, (claimsByStatusMap.get(claim.status) ?? 0) + 1);
  }
  const claimsByStatus = Array.from(claimsByStatusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    range: { start, end },
    revenueByCategory,
    consultationByDepartment,
    bedByDepartment,
    outstandingBalanceCents,
    claimsByStatus,
  };
}
