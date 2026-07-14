import { prisma } from "../../lib/prisma";
import {
  emitRadiologyOrderCreated,
  emitRadiologyReportReady,
} from "../../lib/socket";

export async function listModalities() {
  return prisma.radiologyModality.findMany({ orderBy: { name: "asc" } });
}

export async function createOrder(input: {
  encounterId: string;
  modalityIds: string[];
  orderedBy: string;
}) {
  const encounter = await prisma.encounter.findUniqueOrThrow({
    where: { id: input.encounterId },
  });
  if (encounter.doctorId !== input.orderedBy) {
    throw new Error("FORBIDDEN");
  }

  const order = await prisma.radiologyOrder.create({
    data: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      orderedBy: input.orderedBy,
      items: {
        create: input.modalityIds.map((modalityId) => ({ modalityId })),
      },
    },
    include: {
      items: { include: { modality: true } },
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
    },
  });

  emitRadiologyOrderCreated({
    orderId: order.id,
    patientName: `${order.patient.firstName} ${order.patient.lastName}`,
    studyCount: order.items.length,
  });

  return order;
}

export async function countPending() {
  return prisma.radiologyOrder.count({
    where: { status: { in: ["ORDERED", "IN_PROGRESS"] } },
  });
}

export async function getQueue() {
  const orders = await prisma.radiologyOrder.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      items: {
        include: {
          modality: true,
          report: true,
        },
      },
    },
  });

  const stages = ["ORDERED", "IN_PROGRESS", "COMPLETED"] as const;
  const grouped: Record<string, typeof orders> = {};
  for (const s of stages) grouped[s] = [];
  for (const order of orders) {
    grouped[order.status]?.push(order);
  }
  return grouped;
}

export async function updateStatus(
  orderId: string,
  status: "ORDERED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.radiologyOrder.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    if (status === "IN_PROGRESS") {
      await tx.radiologyOrderItem.updateMany({
        where: { radiologyOrderId: orderId, status: "ORDERED" },
        data: { status: "IN_PROGRESS" },
      });
    }

    return order;
  });
}

export type SubmitReportInput = {
  findings?: string | null;
  impression?: string | null;
  reportFileUrl?: string | null;
};

export async function submitReport(
  radiologyOrderItemId: string,
  enteredBy: string,
  input: SubmitReportInput,
) {
  const item = await prisma.radiologyOrderItem.findUniqueOrThrow({
    where: { id: radiologyOrderItemId },
    include: {
      modality: true,
      radiologyOrder: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
      },
      report: true,
    },
  });

  if (item.report) throw new Error("ALREADY_REPORTED");

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.radiologyReport.create({
      data: {
        radiologyOrderItemId,
        enteredBy,
        findings: input.findings ?? null,
        impression: input.impression ?? null,
        reportFileUrl: input.reportFileUrl ?? null,
      },
    });
    await tx.radiologyOrderItem.update({
      where: { id: radiologyOrderItemId },
      data: { status: "REPORTED" },
    });

    const siblings = await tx.radiologyOrderItem.findMany({
      where: { radiologyOrderId: item.radiologyOrderId },
    });
    const allReported = siblings.every(
      (s) => s.id === radiologyOrderItemId || s.status === "REPORTED",
    );
    await tx.radiologyOrder.update({
      where: { id: item.radiologyOrderId },
      data: {
        status: allReported ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    return created;
  });

  emitRadiologyReportReady({
    orderId: item.radiologyOrderId,
    orderedBy: item.radiologyOrder.orderedBy,
    patientId: item.radiologyOrder.patientId,
    modalityName: item.modality.name,
  });

  return { ...report, modalityName: item.modality.name };
}

export async function getOrderDetail(orderId: string) {
  return prisma.radiologyOrder.findUnique({
    where: { id: orderId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      items: {
        include: {
          modality: true,
          report: true,
        },
      },
    },
  });
}

export async function listPatientReports(patientId: string) {
  const reports = await prisma.radiologyReport.findMany({
    where: {
      radiologyOrderItem: {
        radiologyOrder: { patientId },
        status: "REPORTED",
      },
    },
    orderBy: { reportedAt: "desc" },
    include: {
      radiologyOrderItem: {
        include: {
          modality: true,
          radiologyOrder: {
            select: { id: true, createdAt: true, orderedBy: true },
          },
        },
      },
    },
  });
  return reports;
}
