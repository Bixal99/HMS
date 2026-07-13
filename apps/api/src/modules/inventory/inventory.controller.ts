import type { Request, Response } from "express";
import {
  createInventoryItem,
  getEquipmentById,
  getInventoryAlerts,
  getInventoryItemById,
  listEquipment,
  listInventoryItems,
  NegativeStockError,
  recordTransaction,
  reconcileStock,
  serviceEquipment,
} from "./inventory.service";
import {
  createInventoryItemSchema,
  equipmentServiceSchema,
  listEquipmentQuerySchema,
  listInventoryQuerySchema,
  reconcileSchema,
  recordTransactionSchema,
} from "./inventory.validators";

function wantsAll(all?: string) {
  return all === "1" || all === "true";
}

function resolveDepartmentScope(
  req: Request,
  query: { departmentId?: string; all?: string },
): { departmentId?: string | null; all: boolean } | { error: string; status: number } {
  const isAdmin = req.user!.role === "ADMIN";
  if (isAdmin) {
    if (wantsAll(query.all)) return { all: true };
    if (query.departmentId) return { departmentId: query.departmentId, all: false };
    // Admin default: own staff department if present, else all
    if (req.user!.departmentId) {
      return { departmentId: req.user!.departmentId, all: false };
    }
    return { all: true };
  }

  if (!req.user!.departmentId) {
    return { error: "No department assigned", status: 403 };
  }
  return { departmentId: req.user!.departmentId, all: false };
}

export async function listInventoryHandler(req: Request, res: Response) {
  const parsed = listInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const scope = resolveDepartmentScope(req, parsed.data);
  if ("error" in scope) return res.status(scope.status).json({ error: scope.error });

  const data = await listInventoryItems(scope);
  return res.json({ data });
}

export async function createItemHandler(req: Request, res: Response) {
  const parsed = createInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid item payload" });
  }
  const item = await createInventoryItem(parsed.data);
  return res.status(201).json({ data: item });
}

export async function transactionHandler(req: Request, res: Response) {
  const parsed = recordTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid transaction payload" });
  }

  const { itemId, type, quantity, reasonCode } = parsed.data;
  const role = req.user!.role;

  if (role === "NURSE" && type !== "OUT") {
    return res.status(403).json({ error: "Nurses may only log OUT (usage) transactions" });
  }

  const item = await getInventoryItemById(itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });

  if (role !== "ADMIN" && item.departmentId !== req.user!.departmentId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const updated = await recordTransaction(
      itemId,
      type,
      quantity,
      reasonCode,
      req.user!.id,
    );
    return res.status(201).json({ data: updated });
  } catch (err) {
    if (err instanceof NegativeStockError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof Error && /must be positive/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to record transaction" });
  }
}

export async function reconcileHandler(req: Request, res: Response) {
  const parsed = reconcileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reconcile payload" });
  }

  try {
    const data = await reconcileStock(parsed.data.counts, req.user!.id);
    return res.json({ data, adjusted: data.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Reconciliation failed" });
  }
}

export async function alertsHandler(req: Request, res: Response) {
  const parsed = listInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const scope = resolveDepartmentScope(req, parsed.data);
  if ("error" in scope) return res.status(scope.status).json({ error: scope.error });

  const data = await getInventoryAlerts(scope);
  return res.json(data);
}

export async function alertsCountHandler(req: Request, res: Response) {
  const scope = resolveDepartmentScope(req, {
    all: req.user!.role === "ADMIN" ? "1" : undefined,
  });
  if ("error" in scope) return res.status(scope.status).json({ error: scope.error });
  // For badge: admin sees all; others own dept
  const data = await getInventoryAlerts(
    req.user!.role === "ADMIN"
      ? { all: true }
      : { departmentId: req.user!.departmentId, all: false },
  );
  return res.json({
    count: data.count,
    label: `${data.count} item${data.count === 1 ? "" : "s"} need attention`,
  });
}

export async function listEquipmentHandler(req: Request, res: Response) {
  const parsed = listEquipmentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const scope = resolveDepartmentScope(req, parsed.data);
  if ("error" in scope) return res.status(scope.status).json({ error: scope.error });

  const data = await listEquipment(scope);
  return res.json({ data });
}

export async function serviceEquipmentHandler(req: Request, res: Response) {
  const parsed = equipmentServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid service payload" });
  }

  const id = String(req.params.id);
  const equipment = await getEquipmentById(id);
  if (!equipment) return res.status(404).json({ error: "Equipment not found" });

  if (req.user!.role === "LAB_TECHNICIAN") {
    if (equipment.departmentId !== req.user!.departmentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const data = await serviceEquipment(id, parsed.data);
  return res.json({ data });
}
