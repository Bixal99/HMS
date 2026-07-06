import prisma from "../../lib/prisma";

export class AnalyticsService {
  /**
   * Get main hospital KPIs
   */
  static async getDashboardKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      totalAdmissions,
      appointmentsToday,
      totalBeds,
      occupiedBeds,
      payments
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.admission.count({ where: { dischargedAt: null } }),
      prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.bed.count(),
      prisma.bed.count({ where: { status: 'OCCUPIED' } }),
      prisma.payment.aggregate({
        _sum: { amount: true }
      })
    ]);

    const totalRevenueCents = payments._sum.amount || 0;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalPatients,
      totalAdmissions,
      appointmentsToday,
      occupancyRate,
      totalRevenueCents
    };
  }

  /**
   * Get revenue over the last 7 days
   */
  static async getWeeklyRevenue() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const payments = await prisma.payment.findMany({
      where: { paidAt: { gte: sevenDaysAgo } },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: "asc" }
    });

    // Group by day
    const revenueByDay: Record<string, number> = {};
    payments.forEach(p => {
      const dateStr = p.paidAt.toISOString().split('T')[0];
      revenueByDay[dateStr] = (revenueByDay[dateStr] || 0) + p.amount;
    });

    return Object.keys(revenueByDay).map(date => ({
      date,
      revenueCents: revenueByDay[date]
    }));
  }
}
