import Papa from "papaparse";
import { prisma } from "../../lib/prisma";
import { getOperationalReport } from "./operational.service";
import { getFinancialReport } from "./financial.service";
import { getClinicalReport } from "./clinical.service";
import { renderReportPdf } from "./reportPdf";
import type { ExportFormat, ReportType } from "./reports.validators";

type ExportParams = {
  reportType: ReportType;
  format: ExportFormat;
  start: Date;
  end: Date;
  doctorId?: string | null;
  generatedBy: string;
};

type ExportResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

async function loadReportData(
  reportType: ReportType,
  start: Date,
  end: Date,
  doctorId?: string | null,
) {
  switch (reportType) {
    case "operational":
      return getOperationalReport({ start, end });
    case "financial":
      return getFinancialReport({ start, end });
    case "clinical":
      return getClinicalReport({ start, end, doctorId });
  }
}

function buildCsvRows(
  reportType: ReportType,
  data: Awaited<ReturnType<typeof loadReportData>>,
): Record<string, unknown>[] {
  if (reportType === "operational") {
    const operational = data as Awaited<ReturnType<typeof getOperationalReport>>;
    const rows: Record<string, unknown>[] = [
      {
        section: "summary",
        totalAppointments: operational.totalAppointments,
        noShowCount: operational.noShowCount,
        noShowRate: operational.noShowRate,
        avgWaitMinutes: operational.avgWaitMinutes,
      },
    ];
    for (const row of operational.dailyVolume) {
      rows.push({
        section: "dailyVolume",
        day: row.day,
        appointmentCount: row.count,
      });
    }
    return rows;
  }

  if (reportType === "financial") {
    const financial = data as Awaited<ReturnType<typeof getFinancialReport>>;
    const rows: Record<string, unknown>[] = [];
    for (const r of financial.revenueByCategory) {
      rows.push({ section: "revenueByCategory", key: r.sourceType, valueCents: r.revenueCents });
    }
    for (const r of financial.consultationByDepartment) {
      rows.push({
        section: "consultationByDepartment",
        key: r.departmentName,
        valueCents: r.revenueCents,
      });
    }
    for (const r of financial.bedByDepartment) {
      rows.push({ section: "bedByDepartment", key: r.departmentName, valueCents: r.revenueCents });
    }
    rows.push({
      section: "outstandingBalance",
      key: "total",
      valueCents: financial.outstandingBalanceCents,
    });
    for (const r of financial.claimsByStatus) {
      rows.push({ section: "claimsByStatus", key: r.status, valueCents: r.count });
    }
    return rows;
  }

  const clinical = data as Awaited<ReturnType<typeof getClinicalReport>>;
  const rows: Record<string, unknown>[] = [];
  for (const d of clinical.topDiagnoses) {
    rows.push({
      section: "topDiagnoses",
      key: `${d.icdCode ?? ""} ${d.description}`.trim(),
      value: d.count,
    });
  }
  for (const r of clinical.rxVolumeByDay) {
    rows.push({ section: "rxVolumeByDay", key: r.day, value: r.count });
  }
  for (const r of clinical.dailyBedOccupancy) {
    rows.push({
      section: "dailyBedOccupancy",
      key: r.day,
      value: r.occupiedBeds,
      totalBeds: r.totalBeds,
      occupancyRate: r.occupancyRate,
    });
  }
  return rows;
}

export async function exportReport({
  reportType,
  format,
  start,
  end,
  doctorId,
  generatedBy,
}: ExportParams): Promise<ExportResult> {
  const data = await loadReportData(reportType, start, end, doctorId);

  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (format === "csv") {
    const rows = buildCsvRows(reportType, data);
    const csv = Papa.unparse(rows);
    buffer = Buffer.from(csv, "utf-8");
    contentType = "text/csv";
    extension = "csv";
  } else {
    const pdfBuffer = await renderReportPdf(reportType, data, { start, end });
    buffer = Buffer.from(pdfBuffer);
    contentType = "application/pdf";
    extension = "pdf";
  }

  await prisma.reportSnapshot.create({
    data: {
      reportType,
      paramsJson: {
        start: start.toISOString(),
        end: end.toISOString(),
        ...(doctorId ? { doctorId } : {}),
      },
      format,
      generatedBy,
    },
  });

  return {
    buffer,
    contentType,
    filename: `${reportType}-report-${start.toISOString().slice(0, 10)}-to-${end
      .toISOString()
      .slice(0, 10)}.${extension}`,
  };
}
