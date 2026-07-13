import { prisma } from "../../lib/prisma";
import type { ReasonCode, TransactionType } from "../../generated/prisma/client";

export class NegativeStockError extends Error {
  constructor() {
    super("Transaction would result in negative stock");
    this.name = "NegativeStockError";
  }
}

export async function listInventoryItems(opts: {
  departmentId?: string | null;
  all?: boolean;
}) {
  return prisma.inventoryItem.findMany({
    where: opts.all ? {} : opts.departmentId ? { departmentId: opts.departmentId } : {},
    include: {
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}

export async function createInventoryItem(input: {
  name: string;
  category: string;
  departmentId: string;
  unit: string;
  reorderThreshold: number;
  currentStock?: number;
}) {
  // Initial stock only via create — subsequent changes must go through ledger.
  return prisma.inventoryItem.create({
    data: {
      name: input.name,
      category: input.category,
      departmentId: input.departmentId,
      unit: input.unit,
      reorderThreshold: input.reorderThreshold,
      currentStock: input.currentStock ?? 0,
    },
    include: { department: { select: { id: true, name: true } } },
  });
}

export async function recordTransaction(
  itemId: string,
  type: TransactionType,
  quantity: number,
  reasonCode: ReasonCode,
  performedBy: string,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });

    let delta: number;
    if (type === "IN") {
      if (quantity <= 0) throw new Error("IN quantity must be positive");
      delta = quantity;
    } else if (type === "OUT") {
      if (quantity <= 0) throw new Error("OUT quantity must be positive");
      delta = -quantity;
    } else {
      // ADJUSTMENT: quantity is signed; ledger stores abs
      delta = quantity;
    }

    const newStock = item.currentStock + delta;
    if (newStock < 0) throw new NegativeStockError();

    await tx.inventoryTransaction.create({
      data: {
        itemId,
        type,
        quantity: Math.abs(quantity),
        reasonCode,
        performedBy,
      },
    });

    return tx.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: newStock },
      include: { department: { select: { id: true, name: true } } },
    });
  });
}

export async function reconcileStock(
  counts: { itemId: string; countedStock: number }[],
  performedBy: string,
) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const { itemId, countedStock } of counts) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const delta = countedStock - item.currentStock;
      if (delta === 0) continue;

      await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: "ADJUSTMENT",
          quantity: Math.abs(delta),
          reasonCode: "MISCOUNT",
          performedBy,
        },
      });
      results.push(
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: countedStock },
        }),
      );
    }
    return results;
  });
}

export async function getInventoryAlerts(opts: {
  departmentId?: string | null;
  all?: boolean;
}) {
  const deptFilter = opts.all
    ? {}
    : opts.departmentId
      ? { departmentId: opts.departmentId }
      : {};

  const items = await prisma.inventoryItem.findMany({
    where: deptFilter,
    include: { department: { select: { id: true, name: true } } },
  });

  const lowStock = items.filter((i) => i.currentStock < i.reorderThreshold);

  const now = new Date();
  const equipmentDue = await prisma.equipment.findMany({
    where: {
      ...deptFilter,
      OR: [
        { nextServiceDueAt: { lte: now } },
        { status: "MAINTENANCE" },
      ],
    },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { nextServiceDueAt: "asc" },
  });

  return {
    lowStock,
    equipmentDue,
    count: lowStock.length + equipmentDue.length,
  };
}

export async function listEquipment(opts: {
  departmentId?: string | null;
  all?: boolean;
}) {
  return prisma.equipment.findMany({
    where: opts.all ? {} : opts.departmentId ? { departmentId: opts.departmentId } : {},
    include: { department: { select: { id: true, name: true } } },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}

export async function serviceEquipment(
  id: string,
  input: {
    status?: "OPERATIONAL" | "MAINTENANCE" | "RETIRED";
    lastServicedAt?: Date | null;
    nextServiceDueAt?: Date | null;
  },
) {
  return prisma.equipment.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      lastServicedAt:
        input.lastServicedAt !== undefined ? input.lastServicedAt : new Date(),
      ...(input.nextServiceDueAt !== undefined
        ? { nextServiceDueAt: input.nextServiceDueAt }
        : {}),
    },
    include: { department: { select: { id: true, name: true } } },
  });
}

export async function getEquipmentById(id: string) {
  return prisma.equipment.findUnique({
    where: { id },
    include: { department: { select: { id: true, name: true } } },
  });
}

export async function getInventoryItemById(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: { department: { select: { id: true, name: true } } },
  });
}
