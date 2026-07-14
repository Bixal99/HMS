export async function fetchApiCount(url: string, cookieHeader: string): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${url}`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const body = (await res.json()) as { count: number };
    return body.count ?? 0;
  } catch {
    return 0;
  }
}

export async function cookieHeaderFromStore(): Promise<string> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export type RoleDashboardCounts = {
  pendingLeave: number;
  pharmacyAlerts: number;
  pharmacyQueue: number;
  labQueue: number;
  radiologyQueue: number;
  billingAlerts: number;
  inventoryAlerts: number;
  todayQueue: number;
  occupiedBeds: number;
  availableBeds: number;
};

export async function loadRoleDashboardCounts(
  role: string,
): Promise<Partial<RoleDashboardCounts>> {
  const cookieHeader = await cookieHeaderFromStore();
  const counts: Partial<RoleDashboardCounts> = {};

  const tasks: Promise<void>[] = [];

  if (role === "ADMIN") {
    tasks.push(
      fetchApiCount("/api/staff/leave-requests/pending-count", cookieHeader).then((n) => {
        counts.pendingLeave = n;
      }),
    );
  }
  if (["PHARMACIST", "ADMIN"].includes(role)) {
    tasks.push(
      fetchApiCount("/api/pharmacy/alerts/count", cookieHeader).then((n) => {
        counts.pharmacyAlerts = n;
      }),
      fetchApiCount("/api/pharmacy/queue/count", cookieHeader).then((n) => {
        counts.pharmacyQueue = n;
      }),
    );
  }
  if (["LAB_TECHNICIAN", "ADMIN"].includes(role)) {
    tasks.push(
      fetchApiCount("/api/lab/orders/queue/count", cookieHeader).then((n) => {
        counts.labQueue = n;
      }),
      fetchApiCount("/api/radiology/orders/queue/count", cookieHeader).then((n) => {
        counts.radiologyQueue = n;
      }),
    );
  }
  if (["BILLING_OFFICER", "ADMIN"].includes(role)) {
    tasks.push(
      fetchApiCount("/api/billing/alerts/count", cookieHeader).then((n) => {
        counts.billingAlerts = n;
      }),
    );
  }
  if (["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(role)) {
    tasks.push(
      fetchApiCount("/api/inventory/alerts/count", cookieHeader).then((n) => {
        counts.inventoryAlerts = n;
      }),
    );
  }

  if (["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(role)) {
    tasks.push(loadTodayQueueAndBeds(counts));
  }

  await Promise.all(tasks);
  return counts;
}

async function loadTodayQueueAndBeds(counts: Partial<RoleDashboardCounts>) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [todayQueue, occupiedBeds, availableBeds] = await Promise.all([
      prisma.appointment.count({
        where: {
          scheduledAt: { gte: start, lte: end },
          status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] },
        },
      }),
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
    ]);

    counts.todayQueue = todayQueue;
    counts.occupiedBeds = occupiedBeds;
    counts.availableBeds = availableBeds;
  } catch {
    counts.todayQueue = 0;
    counts.occupiedBeds = 0;
    counts.availableBeds = 0;
  }
}
