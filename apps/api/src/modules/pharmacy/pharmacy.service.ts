import prisma from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { Prisma } from "@prisma/client";

export class PharmacyService {
  // ─── Medicine Catalog ───────────────────────────────────────────────
  static async getMedicines(query: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, medicines] = await Promise.all([
      prisma.medicine.count({ where }),
      prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        include: {
          batches: {
            where: { quantityInStock: { gt: 0 } },
            orderBy: { expiryDate: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // Compute aggregate stock per medicine
    const data = medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.quantityInStock, 0);
      const nearestExpiry = m.batches[0]?.expiryDate || null;
      return { ...m, totalStock, nearestExpiry };
    });

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async createMedicine(data: { name: string; genericName: string; form: string; strength: string; manufacturer?: string; reorderThreshold?: number }) {
    return prisma.medicine.create({ data });
  }

  // ─── Batch Management ──────────────────────────────────────────────
  static async addBatch(data: { medicineId: string; batchNo: string; quantityInStock: number; unitCost: number; expiryDate: string }) {
    const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
    if (!medicine) throw new AppError("Medicine not found", 404);

    return prisma.medicineBatch.create({
      data: {
        medicineId: data.medicineId,
        batchNo: data.batchNo,
        quantityInStock: data.quantityInStock,
        unitCost: data.unitCost,
        expiryDate: new Date(data.expiryDate),
      },
    });
  }

  // ─── Dispensing (FEFO - First Expiry First Out) ────────────────────
  static async dispenseMedicine(prescriptionItemId: string, dispensedByUserId: string) {
    const prescriptionItem = await prisma.prescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      include: { medicine: true, prescription: true },
    });

    if (!prescriptionItem) throw new AppError("Prescription item not found", 404);

    const staffDispenser = await prisma.staff.findUnique({ where: { userId: dispensedByUserId } });
    if (!staffDispenser) throw new AppError("Only pharmacy staff can dispense", 403);

    // Get batches FEFO (earliest expiry first)
    const batches = await prisma.medicineBatch.findMany({
      where: {
        medicineId: prescriptionItem.medicineId,
        quantityInStock: { gt: 0 },
        expiryDate: { gt: new Date() }, // Not expired
      },
      orderBy: { expiryDate: "asc" },
    });

    let remaining = prescriptionItem.durationDays; // simplified: 1 unit per day
    const dispenses = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, batch.quantityInStock);

      const dispense = await prisma.dispense.create({
        data: {
          prescriptionItemId,
          batchId: batch.id,
          quantityDispensed: qty,
          dispensedBy: staffDispenser.id,
        },
      });

      await prisma.medicineBatch.update({
        where: { id: batch.id },
        data: { quantityInStock: { decrement: qty } },
      });

      dispenses.push(dispense);
      remaining -= qty;
    }

    if (remaining > 0) {
      throw new AppError(`Insufficient stock. Short by ${remaining} units.`, 400);
    }

    // Mark prescription as dispensed
    await prisma.prescription.update({
      where: { id: prescriptionItem.prescriptionId },
      data: { status: "DISPENSED" },
    });

    return dispenses;
  }

  // ─── Low Stock Alerts ──────────────────────────────────────────────
  static async getLowStockAlerts() {
    const medicines = await prisma.medicine.findMany({
      include: {
        batches: { where: { quantityInStock: { gt: 0 } } },
      },
    });

    return medicines
      .map((m) => {
        const totalStock = m.batches.reduce((sum, b) => sum + b.quantityInStock, 0);
        return { ...m, totalStock };
      })
      .filter((m) => m.totalStock < m.reorderThreshold);
  }
}
