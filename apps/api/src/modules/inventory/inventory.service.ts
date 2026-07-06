import prisma from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { TransactionType } from "@prisma/client";

export class InventoryService {
  /**
   * Get all inventory items with low stock flags
   */
  static async getInventoryItems() {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { category: "asc" }
    });

    return items.map(item => ({
      ...item,
      isLowStock: item.quantity <= item.reorderLevel
    }));
  }

  /**
   * Add a new item to inventory
   */
  static async createInventoryItem(data: { name: string, category: string, sku: string, quantity: number, unit: string, reorderLevel: number }) {
    return await prisma.inventoryItem.create({
      data
    });
  }

  /**
   * Log an inventory transaction (IN/OUT/ADJUSTMENT)
   */
  static async logTransaction(itemId: string, type: TransactionType, quantity: number, performedByUserId: string, notes?: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError("Inventory item not found", 404);

    let newQuantity = item.quantity;
    if (type === TransactionType.IN) {
      newQuantity += quantity;
    } else if (type === TransactionType.OUT) {
      if (item.quantity < quantity) throw new AppError(`Insufficient stock. Only ${item.quantity} ${item.unit} available.`, 400);
      newQuantity -= quantity;
    } else if (type === TransactionType.ADJUSTMENT) {
      // For adjustments, quantity could be positive or negative difference
      newQuantity += quantity;
      if (newQuantity < 0) newQuantity = 0;
    }

    const [transaction, updatedItem] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId,
          type,
          quantity,
          performedBy: performedByUserId,
          notes
        }
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity }
      })
    ]);

    // Simple notification integration could go here if it drops below reorder level
    // if (updatedItem.quantity <= updatedItem.reorderLevel) {
    //   NotificationService.notifyAdmins("Low Stock Alert", ...);
    // }

    return { transaction, updatedItem };
  }
}
