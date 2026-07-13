import { prisma } from "../../lib/prisma";
import { getIO } from "../../lib/socket";

export async function listCatalog() {
  return prisma.labTestCatalog.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function createLabOrder(input: {
  encounterId: string;
  testIds: string[];
  orderedBy: string;
}) {
  const encounter = await prisma.encounter.findUniqueOrThrow({
    where: { id: input.encounterId },
  });
  if (encounter.doctorId !== input.orderedBy) {
    throw new Error("FORBIDDEN");
  }

  return prisma.labOrder.create({
    data: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      orderedBy: input.orderedBy,
      items: {
        create: input.testIds.map((testId) => ({ testId })),
      },
    },
    include: {
      items: { include: { test: true } },
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
    },
  });
}

export async function getLabQueue() {
  const orders = await prisma.labOrder.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      items: {
        include: {
          test: true,
          result: true,
        },
      },
    },
  });

  const stages = ["ORDERED", "COLLECTED", "IN_PROGRESS", "COMPLETED"] as const;
  const grouped: Record<string, typeof orders> = {};
  for (const s of stages) grouped[s] = [];
  for (const order of orders) {
    grouped[order.status]?.push(order);
  }
  return grouped;
}

export async function updateLabOrderStatus(
  orderId: string,
  status: "ORDERED" | "COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.labOrder.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    if (status === "COLLECTED") {
      await tx.labOrderItem.updateMany({
        where: { labOrderId: orderId, status: "ORDERED" },
        data: { status: "COLLECTED" },
      });
    }

    return order;
  });
}

export async function collectLabOrder(orderId: string) {
  return updateLabOrderStatus(orderId, "COLLECTED");
}

export type SubmitResultInput = {
  resultValueNumeric?: number | null;
  resultValueText?: string | null;
  resultFileUrl?: string | null;
  manualCriticalFlag?: boolean;
};

export async function submitLabResult(
  labOrderItemId: string,
  enteredBy: string,
  input: SubmitResultInput,
) {
  const item = await prisma.labOrderItem.findUniqueOrThrow({
    where: { id: labOrderItemId },
    include: { test: true, labOrder: true, result: true },
  });

  if (item.result) throw new Error("ALREADY_RESULTED");

  let isCritical = false;
  if (item.test.resultType === "NUMERIC" && input.resultValueNumeric != null) {
    const { criticalLow, criticalHigh } = item.test;
    isCritical =
      (criticalLow != null && input.resultValueNumeric < criticalLow) ||
      (criticalHigh != null && input.resultValueNumeric > criticalHigh);
  }
  if (input.manualCriticalFlag) isCritical = true;

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.labResult.create({
      data: {
        labOrderItemId,
        enteredBy,
        isCritical,
        resultValueNumeric: input.resultValueNumeric ?? null,
        resultValueText: input.resultValueText ?? null,
        resultFileUrl: input.resultFileUrl ?? null,
      },
    });
    await tx.labOrderItem.update({
      where: { id: labOrderItemId },
      data: { status: "RESULTED" },
    });

    const siblings = await tx.labOrderItem.findMany({
      where: { labOrderId: item.labOrderId },
    });
    const allResulted = siblings.every((s) => s.status === "RESULTED");
    await tx.labOrder.update({
      where: { id: item.labOrderId },
      data: {
        status: allResulted ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    return created;
  });

  if (isCritical) {
    getIO().to(`doctor:${item.labOrder.orderedBy}`).emit("lab:critical_result", {
      labOrderItemId,
      labOrderId: item.labOrderId,
      testName: item.test.name,
      patientId: item.labOrder.patientId,
      value: input.resultValueNumeric ?? input.resultValueText ?? "See file",
      isCritical: true,
    });
  }

  return { ...result, isCritical, testName: item.test.name };
}

export async function verifyLabResult(resultId: string, verifiedBy: string) {
  return prisma.labResult.update({
    where: { id: resultId },
    data: { verifiedAt: new Date(), verifiedBy },
  });
}

export async function getLabOrderDetail(orderId: string) {
  return prisma.labOrder.findUnique({
    where: { id: orderId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      items: {
        include: {
          test: true,
          result: true,
        },
      },
    },
  });
}

export async function listPatientLabResults(
  patientId: string,
  opts: { patientFacing: boolean },
) {
  const results = await prisma.labResult.findMany({
    where: {
      labOrderItem: { labOrder: { patientId } },
      ...(opts.patientFacing ? { verifiedAt: { not: null } } : {}),
    },
    orderBy: { resultedAt: "desc" },
    include: {
      labOrderItem: {
        include: {
          test: true,
          labOrder: {
            select: { id: true, createdAt: true, orderedBy: true },
          },
        },
      },
    },
  });
  return results;
}
