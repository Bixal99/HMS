import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { emitPharmacyDispensed, emitPharmacyRxReady, emitPharmacyStockUnavailable } from "../../lib/socket";
import { addDays, startOfDay } from "date-fns";

type Tx = Prisma.TransactionClient;

export async function listMedicinesWithStock() {
  const medicines = await prisma.medicine.findMany({
    include: {
      batches: {
        where: { quantityInStock: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return medicines.map((m) => {
    const totalStock = m.batches.reduce((s, b) => s + b.quantityInStock, 0);
    return {
      ...m,
      totalStock,
      lowStock: totalStock < m.reorderThreshold,
    };
  });
}

export async function getPharmacyQueue() {
  const prescriptions = await prisma.prescription.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true },
      },
      doctor: {
        select: { user: { select: { name: true } }, designation: true },
      },
      items: {
        include: {
          medicine: true,
          dispenses: {
            include: {
              batch: { select: { id: true, batchNo: true, expiryDate: true } },
            },
          },
        },
      },
    },
  });

  const stages = [
    "PENDING_REVIEW",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
  ] as const;

  const grouped: Record<string, typeof prescriptions> = {};
  for (const stage of stages) grouped[stage] = [];
  for (const rx of prescriptions) {
    grouped[rx.pharmacyStage]?.push(rx);
  }
  return grouped;
}

export async function countPendingPharmacyQueue() {
  return prisma.prescription.count({
    where: {
      status: { not: "CANCELLED" },
      pharmacyStage: { in: ["PENDING_REVIEW", "PREPARING"] },
    },
  });
}

export async function updatePharmacyStage(
  prescriptionId: string,
  pharmacyStage:
    | "PENDING_REVIEW"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "COMPLETED",
) {
  const updated = await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { pharmacyStage },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (pharmacyStage === "READY_FOR_PICKUP") {
    emitPharmacyRxReady({
      prescriptionId: updated.id,
      patientId: updated.patientId,
      patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
    });
  }

  return updated;
}

/** Look up Rx context for stock-unavailable notify (called after failed dispense). */
export async function getPrescriptionNotifyContext(prescriptionItemId: string) {
  const item = await prisma.prescriptionItem.findUnique({
    where: { id: prescriptionItemId },
    include: {
      medicine: {
        select: { id: true, name: true, form: true, genericName: true },
      },
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!item) return null;
  return {
    prescriptionId: item.prescriptionId,
    doctorId: item.prescription.doctorId,
    medicineId: item.medicine.id,
    medicineHint: item.medicine.name,
    form: item.medicine.form,
    genericName: item.medicine.genericName,
    patientName: `${item.prescription.patient.firstName} ${item.prescription.patient.lastName}`,
  };
}

export async function findStockAlternatives(input: {
  medicineId: string;
  form: string;
  genericName?: string | null;
  limit?: number;
}) {
  const limit = input.limit ?? 5;
  const medicines = await prisma.medicine.findMany({
    where: {
      id: { not: input.medicineId },
      OR: [
        { form: { equals: input.form, mode: "insensitive" } },
        ...(input.genericName
          ? [
              {
                genericName: {
                  contains: input.genericName,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    },
    include: {
      batches: {
        where: { quantityInStock: { gt: 0 } },
        select: { quantityInStock: true },
      },
    },
    take: 40,
  });

  return medicines
    .map((m) => ({
      id: m.id,
      label: `${m.name} ${m.strength}`.trim(),
      totalStock: m.batches.reduce((s, b) => s + b.quantityInStock, 0),
    }))
    .filter((m) => m.totalStock > 0)
    .slice(0, limit)
    .map((m) => m.label);
}

export async function listPatientPrescriptions(patientId: string) {
  return prisma.prescription.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          medicine: {
            select: { name: true, strength: true, form: true },
          },
        },
      },
      doctor: {
        select: { designation: true, user: { select: { name: true } } },
      },
    },
  });
}

async function maybeMarkPrescriptionFulfilled(tx: Tx, prescriptionId: string) {
  const items = await tx.prescriptionItem.findMany({
    where: { prescriptionId },
    include: { dispenses: true },
  });
  const allFulfilled = items.every(
    (i) =>
      i.dispenses.reduce((s, d) => s + d.quantityDispensed, 0) >=
      i.quantityPrescribed,
  );
  if (allFulfilled) {
    await tx.prescription.update({
      where: { id: prescriptionId },
      data: { status: "FULFILLED", pharmacyStage: "COMPLETED" },
    });
  }
}

export async function dispensePrescriptionItem(
  prescriptionItemId: string,
  dispensedBy: string,
  overrideBatchId?: string,
  quantity?: number,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.prescriptionItem.findUniqueOrThrow({
      where: { id: prescriptionItemId },
      include: { dispenses: true },
    });

    const alreadyDispensed = item.dispenses.reduce(
      (sum, d) => sum + d.quantityDispensed,
      0,
    );
    const remaining = item.quantityPrescribed - alreadyDispensed;
    if (remaining <= 0) throw new Error("ALREADY_DISPENSED");

    const requested = quantity ?? remaining;
    if (requested > remaining) throw new Error("QUANTITY_EXCEEDS_REMAINING");

    const batches = await tx.medicineBatch.findMany({
      where: {
        medicineId: item.medicineId,
        quantityInStock: { gt: 0 },
        ...(overrideBatchId ? { id: overrideBatchId } : {}),
      },
      orderBy: { expiryDate: "asc" },
    });

    if (overrideBatchId && batches.length === 0) {
      throw new Error("BATCH_NOT_FOUND");
    }

    let toDispense = requested;
    for (const batch of batches) {
      if (toDispense <= 0) break;
      const fromThisBatch = Math.min(batch.quantityInStock, toDispense);

      await tx.dispense.create({
        data: {
          prescriptionItemId,
          batchId: batch.id,
          quantityDispensed: fromThisBatch,
          dispensedBy,
        },
      });
      await tx.medicineBatch.update({
        where: { id: batch.id },
        data: { quantityInStock: { decrement: fromThisBatch } },
      });
      toDispense -= fromThisBatch;
    }

    if (toDispense > 0) {
      throw new Error(`INSUFFICIENT_STOCK:${toDispense}`);
    }

    await maybeMarkPrescriptionFulfilled(tx, item.prescriptionId);
    return { dispensedQuantity: requested, prescriptionId: item.prescriptionId };
  }).then(async (result) => {
    const rx = await prisma.prescription.findUnique({
      where: { id: result.prescriptionId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (rx) {
      emitPharmacyDispensed({
        prescriptionId: rx.id,
        patientId: rx.patientId,
        patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
      });
    }
    return { dispensedQuantity: result.dispensedQuantity };
  });
}

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createPurchaseOrder(input: {
  supplierId: string;
  status: "DRAFT" | "ORDERED";
  items: Array<{ medicineId: string; quantity: number; unitCostCents: number }>;
}) {
  return prisma.purchaseOrder.create({
    data: {
      supplierId: input.supplierId,
      status: input.status,
      orderedAt: input.status === "ORDERED" ? new Date() : null,
      items: {
        create: input.items.map((i) => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          unitCostCents: i.unitCostCents,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { medicine: true } },
    },
  });
}

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  lines: Array<{
    purchaseOrderItemId: string;
    batchNo: string;
    expiryDate: Date;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: purchaseOrderId },
      include: { items: true },
    });
    if (po.status === "RECEIVED") throw new Error("ALREADY_RECEIVED");

    for (const line of lines) {
      const poItem = po.items.find((i) => i.id === line.purchaseOrderItemId);
      if (!poItem) throw new Error("INVALID_PO_ITEM");

      await tx.medicineBatch.create({
        data: {
          medicineId: poItem.medicineId,
          batchNo: line.batchNo,
          quantityInStock: poItem.quantity,
          unitCostCents: poItem.unitCostCents,
          expiryDate: line.expiryDate,
        },
      });
    }

    return tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: {
        supplier: true,
        items: { include: { medicine: true } },
      },
    });
  });
}

export async function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      items: { include: { medicine: true } },
    },
  });
}

export async function getPharmacyAlerts() {
  const horizon = addDays(startOfDay(new Date()), 30);

  const medicines = await prisma.medicine.findMany({
    include: { batches: true },
  });

  const lowStock = medicines
    .map((m) => {
      const totalStock = m.batches.reduce((s, b) => s + b.quantityInStock, 0);
      return { medicine: m, totalStock };
    })
    .filter((row) => row.totalStock < row.medicine.reorderThreshold)
    .map((row) => ({
      type: "LOW_STOCK" as const,
      medicineId: row.medicine.id,
      medicineName: `${row.medicine.name} ${row.medicine.strength}`,
      totalStock: row.totalStock,
      reorderThreshold: row.medicine.reorderThreshold,
      message: `Low stock: ${row.totalStock} on hand (threshold ${row.medicine.reorderThreshold})`,
    }));

  const nearExpiryBatches = await prisma.medicineBatch.findMany({
    where: {
      quantityInStock: { gt: 0 },
      expiryDate: { lte: horizon },
    },
    include: { medicine: true },
    orderBy: { expiryDate: "asc" },
  });

  const nearExpiry = nearExpiryBatches.map((b) => {
    const days = Math.ceil(
      (b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return {
      type: "NEAR_EXPIRY" as const,
      batchId: b.id,
      batchNo: b.batchNo,
      medicineId: b.medicineId,
      medicineName: `${b.medicine.name} ${b.medicine.strength}`,
      expiryDate: b.expiryDate,
      quantityInStock: b.quantityInStock,
      daysUntilExpiry: days,
      message:
        days < 0
          ? `Expired ${Math.abs(days)} day(s) ago (batch ${b.batchNo})`
          : `Expires in ${days} day(s) (batch ${b.batchNo})`,
    };
  });

  return {
    lowStock,
    nearExpiry,
    count: lowStock.length + nearExpiry.length,
  };
}

export async function getFefoSuggestion(medicineId: string) {
  return prisma.medicineBatch.findFirst({
    where: { medicineId, quantityInStock: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });
}

export async function getPrescriptionDetail(prescriptionId: string) {
  return prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true },
      },
      items: {
        include: {
          medicine: true,
          dispenses: {
            include: {
              batch: true,
            },
          },
        },
      },
    },
  });
}

export async function listBatchesForMedicine(medicineId: string) {
  return prisma.medicineBatch.findMany({
    where: { medicineId, quantityInStock: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });
}
