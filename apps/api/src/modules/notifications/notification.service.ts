import prisma from "../../lib/prisma";

export class NotificationService {
  /**
   * Create a new notification for a specific user
   */
  static async pushNotification(userId: string, type: string, title: string, body: string, link?: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
        isRead: false
      }
    });
    return notification;
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50 // Limit to 50 most recent
    });
    return notifications;
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}
