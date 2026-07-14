import type { ChartPalette } from "@/components/dashboard/DashboardChartCard";

export type ChartSeriesSpec = {
  title: string;
  ariaLabel: string;
  rows: { label: string; value: number }[];
  type?: "bar" | "line" | "doughnut";
  palette?: ChartPalette;
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastSevenDayLabels(): { key: string; label: string; start: Date; end: Date }[] {
  const days: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const key = dayKey(start);
    days.push({ key, label: key.slice(5), start, end });
  }
  return days;
}

function groupCount<T extends string>(
  rows: { status: T }[],
  labels: T[],
): { label: string; value: number }[] {
  const map = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const row of rows) {
    map.set(row.status, (map.get(row.status) ?? 0) + 1);
  }
  return labels.map((l) => ({
    label: l.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: map.get(l) ?? 0,
  }));
}

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function appointmentsByDaySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const start = days[0]!.start;
    const end = days[days.length - 1]!.end;
    const rows = await prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      select: { scheduledAt: true },
    });
    const counts = new Map(days.map((d) => [d.key, 0]));
    for (const row of rows) {
      const key = dayKey(new Date(row.scheduledAt));
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      title: "Appointments (7 days)",
      ariaLabel: "Line or bar chart of appointments over the last seven days",
      rows: days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 })),
      type: "bar",
      palette: "blue",
    };
  } catch {
    return {
      title: "Appointments (7 days)",
      ariaLabel: "Appointments over the last seven days",
      rows: [],
      type: "bar",
      palette: "blue",
    };
  }
}

export async function todayQueueByStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const rows = await prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      select: { status: true },
    });
    return {
      title: "Today's queue by status",
      ariaLabel: "Doughnut chart of today's appointments by status",
      rows: groupCount(rows, [
        "CONFIRMED",
        "CHECKED_IN",
        "WAITING",
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ]),
      type: "doughnut",
      palette: "teal",
    };
  } catch {
    return {
      title: "Today's queue by status",
      ariaLabel: "Today's appointments by status",
      rows: [],
      type: "doughnut",
      palette: "teal",
    };
  }
}

export async function appointmentOutcomeSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const start = days[0]!.start;
    const end = days[days.length - 1]!.end;
    const rows = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: start, lte: end },
        status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      },
      select: { status: true },
    });
    return {
      title: "Visit outcomes (7 days)",
      ariaLabel: "Doughnut of completed versus cancelled and no-show appointments",
      rows: groupCount(rows, ["COMPLETED", "CANCELLED", "NO_SHOW"]),
      type: "doughnut",
      palette: "amber",
    };
  } catch {
    return {
      title: "Visit outcomes (7 days)",
      ariaLabel: "Visit outcomes",
      rows: [],
      type: "doughnut",
      palette: "amber",
    };
  }
}

export async function bedOccupancySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const [occupied, available, maintenance] = await Promise.all([
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
      prisma.bed.count({ where: { status: "MAINTENANCE" } }),
    ]);
    return {
      title: "Bed occupancy",
      ariaLabel: "Doughnut of occupied, available, and maintenance beds",
      rows: [
        { label: "Occupied", value: occupied },
        { label: "Available", value: available },
        { label: "Maintenance", value: maintenance },
      ],
      type: "doughnut",
      palette: "violet",
    };
  } catch {
    return {
      title: "Bed occupancy",
      ariaLabel: "Bed occupancy",
      rows: [],
      type: "doughnut",
      palette: "violet",
    };
  }
}

export async function bedsByWardSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const wards = await prisma.ward.findMany({
      select: {
        name: true,
        beds: { select: { status: true } },
      },
      orderBy: { name: "asc" },
      take: 8,
    });
    return {
      title: "Occupied beds by ward",
      ariaLabel: "Bar chart of occupied beds per ward",
      rows: wards.map((w) => ({
        label: w.name.length > 12 ? `${w.name.slice(0, 11)}…` : w.name,
        value: w.beds.filter((b) => b.status === "OCCUPIED").length,
      })),
      type: "bar",
      palette: "teal",
    };
  } catch {
    return {
      title: "Occupied beds by ward",
      ariaLabel: "Occupied beds by ward",
      rows: [],
      type: "bar",
      palette: "teal",
    };
  }
}

export async function bedAvailabilityBarSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const [occupied, available] = await Promise.all([
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
    ]);
    return {
      title: "Beds snapshot",
      ariaLabel: "Bar chart comparing occupied and available beds",
      rows: [
        { label: "Occupied", value: occupied },
        { label: "Available", value: available },
      ],
      type: "bar",
      palette: "slate",
    };
  } catch {
    return {
      title: "Beds snapshot",
      ariaLabel: "Beds snapshot",
      rows: [],
      type: "bar",
      palette: "slate",
    };
  }
}

export async function surgeryByStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.surgeryRequest.findMany({
      select: { status: true },
    });
    return {
      title: "Surgery board",
      ariaLabel: "Bar chart of surgery requests by status",
      rows: groupCount(rows, ["REQUESTED", "SCHEDULED", "COMPLETED", "CANCELLED"]),
      type: "bar",
      palette: "rose",
    };
  } catch {
    return {
      title: "Surgery board",
      ariaLabel: "Surgery requests by status",
      rows: [],
      type: "bar",
      palette: "rose",
    };
  }
}

export async function activeAdmissionsSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const [active, available] = await Promise.all([
      prisma.admission.count({ where: { dischargedAt: null } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
    ]);
    // Snapshot trend: distribute active admissions as a flat reference line vs available
    return {
      title: "Census vs capacity",
      ariaLabel: "Bar chart of active admissions versus available beds",
      rows: [
        { label: "Admitted", value: active },
        { label: "Available", value: available },
        {
          label: "7d appts",
          value: await prisma.appointment.count({
            where: {
              scheduledAt: { gte: days[0]!.start, lte: days[days.length - 1]!.end },
            },
          }),
        },
      ],
      type: "bar",
      palette: "amber",
    };
  } catch {
    return {
      title: "Census vs capacity",
      ariaLabel: "Census versus capacity",
      rows: [],
      type: "bar",
      palette: "amber",
    };
  }
}

export async function inventoryAlertSeries(
  inventoryAlerts: number,
): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        select: { currentStock: true, reorderThreshold: true },
      }),
      prisma.inventoryItem.count(),
    ]);
    const below = items.filter((i) => i.currentStock < i.reorderThreshold).length;
    return {
      title: "Inventory attention",
      ariaLabel: "Bar chart of inventory alerts and low-stock items",
      rows: [
        { label: "Alerts", value: inventoryAlerts },
        { label: "Low stock", value: below },
        { label: "Items", value: total },
      ],
      type: "bar",
      palette: "amber",
    };
  } catch {
    return {
      title: "Inventory attention",
      ariaLabel: "Inventory alerts",
      rows: [
        { label: "Alerts", value: inventoryAlerts },
        { label: "Low stock", value: 0 },
      ],
      type: "bar",
      palette: "amber",
    };
  }
}

export async function pharmacyQueueSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.prescription.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { pharmacyStage: true, status: true },
    });
    const stageMap = new Map<string, number>();
    for (const r of rows) {
      const key = r.status === "FULFILLED" ? "COMPLETED" : r.pharmacyStage;
      stageMap.set(key, (stageMap.get(key) ?? 0) + 1);
    }
    const labels = [
      "PENDING_REVIEW",
      "PREPARING",
      "READY_FOR_PICKUP",
      "COMPLETED",
    ] as const;
    return {
      title: "Pharmacy pipeline",
      ariaLabel: "Doughnut of prescriptions by pharmacy stage",
      rows: labels.map((l) => ({
        label: l.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: stageMap.get(l) ?? 0,
      })),
      type: "doughnut",
      palette: "teal",
    };
  } catch {
    return {
      title: "Pharmacy pipeline",
      ariaLabel: "Pharmacy pipeline",
      rows: [],
      type: "doughnut",
      palette: "teal",
    };
  }
}

export async function pharmacyDispenseByDaySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const start = days[0]!.start;
    const end = days[days.length - 1]!.end;
    const rows = await prisma.dispense.findMany({
      where: { dispensedAt: { gte: start, lte: end } },
      select: { dispensedAt: true },
    });
    const counts = new Map(days.map((d) => [d.key, 0]));
    for (const row of rows) {
      const key = dayKey(new Date(row.dispensedAt));
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      title: "Dispenses (7 days)",
      ariaLabel: "Line chart of dispenses over the last seven days",
      rows: days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 })),
      type: "line",
      palette: "blue",
    };
  } catch {
    return {
      title: "Dispenses (7 days)",
      ariaLabel: "Dispenses over seven days",
      rows: [],
      type: "line",
      palette: "blue",
    };
  }
}

export async function pharmacyRxStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.prescription.findMany({
      select: { status: true },
    });
    return {
      title: "Prescription status",
      ariaLabel: "Bar chart of prescriptions by status",
      rows: groupCount(rows, ["PENDING", "FULFILLED", "CANCELLED"]),
      type: "bar",
      palette: "violet",
    };
  } catch {
    return {
      title: "Prescription status",
      ariaLabel: "Prescription status",
      rows: [],
      type: "bar",
      palette: "violet",
    };
  }
}

export async function labOrdersByStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.labOrder.findMany({
      select: { status: true },
    });
    return {
      title: "Lab orders by status",
      ariaLabel: "Bar chart of lab orders by status",
      rows: groupCount(rows, [
        "ORDERED",
        "COLLECTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ]),
      type: "bar",
      palette: "blue",
    };
  } catch {
    return {
      title: "Lab orders by status",
      ariaLabel: "Lab orders by status",
      rows: [],
      type: "bar",
      palette: "blue",
    };
  }
}

export async function radiologyByStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.radiologyOrder.findMany({
      select: { status: true },
    });
    return {
      title: "Imaging by status",
      ariaLabel: "Bar chart of radiology orders by status",
      rows: groupCount(rows, ["ORDERED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
      type: "bar",
      palette: "violet",
    };
  } catch {
    return {
      title: "Imaging by status",
      ariaLabel: "Imaging orders by status",
      rows: [],
      type: "bar",
      palette: "violet",
    };
  }
}

export async function radiologyByDaySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const start = days[0]!.start;
    const end = days[days.length - 1]!.end;
    const rows = await prisma.radiologyOrder.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    });
    const counts = new Map(days.map((d) => [d.key, 0]));
    for (const row of rows) {
      const key = dayKey(new Date(row.createdAt));
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      title: "Imaging orders (7 days)",
      ariaLabel: "Line chart of imaging orders over the last seven days",
      rows: days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 })),
      type: "line",
      palette: "violet",
    };
  } catch {
    return {
      title: "Imaging orders (7 days)",
      ariaLabel: "Imaging orders over seven days",
      rows: [],
      type: "line",
      palette: "violet",
    };
  }
}

export async function labVsImagingSeries(
  labQueue: number,
  imagingQueue: number,
): Promise<ChartSeriesSpec> {
  return {
    title: "Lab vs imaging queue",
    ariaLabel: "Doughnut comparing lab and imaging queue depth",
    rows: [
      { label: "Lab", value: labQueue },
      { label: "Imaging", value: imagingQueue },
    ],
    type: "doughnut",
    palette: "teal",
  };
}

export async function equipmentStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.equipment.findMany({
      select: { status: true },
    });
    return {
      title: "Equipment status",
      ariaLabel: "Doughnut of equipment by operational status",
      rows: groupCount(rows, ["OPERATIONAL", "MAINTENANCE", "RETIRED"]),
      type: "doughnut",
      palette: "slate",
    };
  } catch {
    return {
      title: "Equipment status",
      ariaLabel: "Equipment status",
      rows: [],
      type: "doughnut",
      palette: "slate",
    };
  }
}

export async function invoiceStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.invoice.findMany({
      select: { status: true },
    });
    return {
      title: "Invoices by status",
      ariaLabel: "Bar chart of invoices by status",
      rows: groupCount(rows, ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"]),
      type: "bar",
      palette: "amber",
    };
  } catch {
    return {
      title: "Invoices by status",
      ariaLabel: "Invoices by status",
      rows: [],
      type: "bar",
      palette: "amber",
    };
  }
}

export async function claimsByStatusSeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.insuranceClaim.findMany({
      select: { status: true },
    });
    return {
      title: "Claims by status",
      ariaLabel: "Doughnut of insurance claims by status",
      rows: groupCount(rows, ["SUBMITTED", "APPROVED", "DENIED"]),
      type: "doughnut",
      palette: "rose",
    };
  } catch {
    return {
      title: "Claims by status",
      ariaLabel: "Claims by status",
      rows: [],
      type: "doughnut",
      palette: "rose",
    };
  }
}

export async function paymentsByDaySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const days = lastSevenDayLabels();
    const start = days[0]!.start;
    const end = days[days.length - 1]!.end;
    const rows = await prisma.payment.findMany({
      where: { paidAt: { gte: start, lte: end } },
      select: { paidAt: true, amountCents: true },
    });
    const counts = new Map(days.map((d) => [d.key, 0]));
    for (const row of rows) {
      const key = dayKey(new Date(row.paidAt));
      if (counts.has(key)) {
        // Show payment count (not cents) for readable axis
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return {
      title: "Payments (7 days)",
      ariaLabel: "Line chart of payment count over the last seven days",
      rows: days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 })),
      type: "line",
      palette: "teal",
    };
  } catch {
    return {
      title: "Payments (7 days)",
      ariaLabel: "Payments over seven days",
      rows: [],
      type: "line",
      palette: "teal",
    };
  }
}

export async function revenueByCategorySeries(): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { not: "VOID" },
        issuedAt: { gte: start, lte: end },
      },
      include: { items: true },
    });
    const map = new Map<string, number>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        map.set(
          item.sourceType,
          (map.get(item.sourceType) ?? 0) + item.lineTotalCents,
        );
      }
    }
    // Convert cents to whole currency units for chart readability
    const rows = Array.from(map.entries()).map(([label, cents]) => ({
      label: label.replace(/_/g, " "),
      value: Math.round(cents / 100),
    }));
    return {
      title: "Revenue by category",
      ariaLabel: "Bar chart of revenue by invoice category in the last seven days",
      rows,
      type: "bar",
      palette: "blue",
    };
  } catch {
    return {
      title: "Revenue by category",
      ariaLabel: "Revenue by category",
      rows: [],
      type: "bar",
      palette: "blue",
    };
  }
}

export function queueVsAlertsSeries(
  queue: number,
  alerts: number,
): ChartSeriesSpec {
  return {
    title: "Queue vs alerts",
    ariaLabel: "Doughnut comparing fulfillment queue and stock alerts",
    rows: [
      { label: "Queue", value: queue },
      { label: "Alerts", value: alerts },
    ],
    type: "doughnut",
    palette: "amber",
  };
}

export async function appointmentsLineSeries(): Promise<ChartSeriesSpec> {
  const series = await appointmentsByDaySeries();
  return { ...series, type: "line", palette: "violet", title: "Bookings (7 days)" };
}

export function billingAlertsDoughnut(
  alerts: number,
  drafts = 0,
  openInvoices = 0,
): ChartSeriesSpec {
  return {
    title: "Billing attention",
    ariaLabel: "Doughnut of billing alerts, draft invoices, and open invoices",
    rows: [
      { label: "Alerts", value: alerts },
      { label: "Drafts", value: drafts },
      { label: "Open", value: openInvoices },
    ],
    type: "doughnut",
    palette: "amber",
  };
}

export async function billingAttentionSeries(
  alerts: number,
): Promise<ChartSeriesSpec> {
  try {
    const prisma = await getPrisma();
    const [drafts, openInvoices] = await Promise.all([
      prisma.invoice.count({ where: { status: "DRAFT" } }),
      prisma.invoice.count({
        where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      }),
    ]);
    return billingAlertsDoughnut(alerts, drafts, openInvoices);
  } catch {
    return billingAlertsDoughnut(alerts);
  }
}
