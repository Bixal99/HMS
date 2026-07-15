import type { Request, Response } from "express";
import { parseISO } from "date-fns";
import { emitPharmacyStockUnavailable } from "../../lib/socket";
import {
  createMedicine,
  createPurchaseOrder,
  countPendingPharmacyQueue,
  dispensePrescriptionItem,
  findStockAlternatives,
  getPharmacyAlerts,
  getPharmacyQueue,
  getPrescriptionDetail,
  getPrescriptionNotifyContext,
  listBatchesForMedicine,
  listMedicinesWithStock,
  listPatientPrescriptions,
  listPurchaseOrders,
  listSuppliers,
  receivePurchaseOrder,
  updateMedicine,
  updatePharmacyStage,
} from "./pharmacy.service";
import { resolvePatientId } from "../appointments/appointments.service";
import {
  createMedicineSchema,
  createPoSchema,
  dispenseSchema,
  receivePoSchema,
  stageSchema,
  updateMedicineSchema,
} from "./pharmacy.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function listMedicinesHandler(_req: Request, res: Response) {
  const data = await listMedicinesWithStock();
  return res.json({ data });
}

export async function createMedicineHandler(req: Request, res: Response) {
  const parsed = createMedicineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const data = await createMedicine(parsed.data);
  return res.status(201).json({ data });
}

export async function updateMedicineHandler(req: Request, res: Response) {
  const parsed = updateMedicineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await updateMedicine(paramId(req), parsed.data);
    return res.json({ data });
  } catch {
    return res.status(404).json({ error: "Medicine not found" });
  }
}

export async function queueHandler(_req: Request, res: Response) {
  const data = await getPharmacyQueue();
  return res.json({ data });
}

export async function queueCountHandler(_req: Request, res: Response) {
  const count = await countPendingPharmacyQueue();
  return res.json({ count });
}

export async function stageHandler(req: Request, res: Response) {
  const parsed = stageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid stage" });
  }
  const updated = await updatePharmacyStage(
    paramId(req, "prescriptionId"),
    parsed.data.pharmacyStage,
  );
  return res.json(updated);
}

export async function dispenseHandler(req: Request, res: Response) {
  const parsed = dispenseSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const result = await dispensePrescriptionItem(
      paramId(req, "prescriptionItemId"),
      req.user!.id,
      parsed.data.overrideBatchId,
      parsed.data.quantity,
    );
    return res.status(201).json(result);
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    if (err.message === "ALREADY_DISPENSED") {
      return res.status(400).json({ error: "Item already fully dispensed" });
    }
    if (err.message === "QUANTITY_EXCEEDS_REMAINING") {
      return res.status(400).json({ error: "Quantity exceeds remaining amount" });
    }
    if (err.message === "BATCH_NOT_FOUND") {
      return res.status(400).json({ error: "Override batch not available" });
    }
    if (err.message.startsWith("INSUFFICIENT_STOCK:")) {
      const short = err.message.split(":")[1];
      const ctx = await getPrescriptionNotifyContext(
        paramId(req, "prescriptionItemId"),
      );
      let alternatives: string[] = [];
      if (ctx) {
        alternatives = await findStockAlternatives({
          medicineId: ctx.medicineId,
          form: ctx.form,
          genericName: ctx.genericName,
        });
        emitPharmacyStockUnavailable({
          prescriptionId: ctx.prescriptionId,
          doctorId: ctx.doctorId,
          medicineHint: ctx.medicineHint,
          patientName: ctx.patientName,
          alternatives,
        });
      }
      return res.status(409).json({
        error: `Insufficient stock: ${short} unit(s) short across all batches`,
        alternatives,
      });
    }
    throw err;
  }
}

export async function suppliersHandler(_req: Request, res: Response) {
  const data = await listSuppliers();
  return res.json({ data });
}

export async function createPoHandler(req: Request, res: Response) {
  const parsed = createPoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const po = await createPurchaseOrder({
    supplierId: parsed.data.supplierId,
    status: parsed.data.status ?? "ORDERED",
    items: parsed.data.items,
  });
  return res.status(201).json(po);
}

export async function listPoHandler(_req: Request, res: Response) {
  const data = await listPurchaseOrders();
  return res.json({ data });
}

export async function receivePoHandler(req: Request, res: Response) {
  const parsed = receivePoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const po = await receivePurchaseOrder(
      paramId(req),
      parsed.data.items.map((i) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        batchNo: i.batchNo,
        expiryDate: parseISO(i.expiryDate),
      })),
    );
    return res.json(po);
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_RECEIVED") {
      return res.status(400).json({ error: "Purchase order already received" });
    }
    if (err instanceof Error && err.message === "INVALID_PO_ITEM") {
      return res.status(400).json({ error: "Invalid purchase order item" });
    }
    throw err;
  }
}

export async function alertsHandler(_req: Request, res: Response) {
  const data = await getPharmacyAlerts();
  return res.json(data);
}

export async function alertsCountHandler(_req: Request, res: Response) {
  const data = await getPharmacyAlerts();
  return res.json({ count: data.count });
}

export async function prescriptionDetailHandler(req: Request, res: Response) {
  const rx = await getPrescriptionDetail(paramId(req, "prescriptionId"));
  if (!rx) return res.status(404).json({ error: "Not found" });

  const items = await Promise.all(
    rx.items.map(async (item) => {
      const batches = await listBatchesForMedicine(item.medicineId);
      const dispensed = item.dispenses.reduce((s, d) => s + d.quantityDispensed, 0);
      return {
        ...item,
        dispensed,
        remaining: item.quantityPrescribed - dispensed,
        fefoBatch: batches[0] ?? null,
        availableBatches: batches,
      };
    }),
  );

  return res.json({ ...rx, items });
}

export async function minePrescriptionsHandler(req: Request, res: Response) {
  const patientId = await resolvePatientId(req.user!.id);
  if (!patientId) return res.status(403).json({ error: "No patient profile" });
  const data = await listPatientPrescriptions(patientId);
  return res.json({ data });
}
