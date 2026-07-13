import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { getOperationalReport } from "./operational.service";
import type { getFinancialReport } from "./financial.service";
import type { getClinicalReport } from "./clinical.service";
import type { ReportType } from "./reports.validators";

type OperationalData = Awaited<ReturnType<typeof getOperationalReport>>;
type FinancialData = Awaited<ReturnType<typeof getFinancialReport>>;
type ClinicalData = Awaited<ReturnType<typeof getClinicalReport>>;
type ReportData = OperationalData | FinancialData | ClinicalData;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  heading: { fontSize: 18, marginBottom: 4, color: "#1a5cd6", fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#333" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  colKey: { width: "70%" },
  colValue: { width: "30%", textAlign: "right" },
  empty: { color: "#999", fontStyle: "italic" },
  footer: { marginTop: 28, fontSize: 8, color: "#888" },
  bold: { fontFamily: "Helvetica-Bold" },
});

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type ReportSection = { title: string; rows: Array<{ key: string; value: string }> };

function KeyValueTable({ title, rows }: ReportSection) {
  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, title),
    React.createElement(
      View,
      { style: styles.tableHeader },
      React.createElement(Text, { style: [styles.colKey, styles.bold] }, "Metric"),
      React.createElement(Text, { style: [styles.colValue, styles.bold] }, "Value"),
    ),
    rows.length === 0
      ? React.createElement(Text, { style: styles.empty }, "No data for this range")
      : rows.map((r, i) =>
          React.createElement(
            View,
            { key: String(i), style: styles.tableRow },
            React.createElement(Text, { style: styles.colKey }, r.key),
            React.createElement(Text, { style: styles.colValue }, r.value),
          ),
        ),
  );
}

function reportTitle(reportType: ReportType) {
  return `${reportType.charAt(0).toUpperCase()}${reportType.slice(1)} Report`;
}

function buildOperationalSections(data: OperationalData): ReportSection[] {
  return [
    {
      title: "Summary",
      rows: [
        { key: "Total appointments", value: String(data.totalAppointments) },
        { key: "No-show count", value: String(data.noShowCount) },
        { key: "No-show rate", value: `${(data.noShowRate * 100).toFixed(1)}%` },
        {
          key: "Avg wait (minutes)",
          value: data.avgWaitMinutes !== null ? data.avgWaitMinutes.toFixed(1) : "N/A",
        },
      ],
    },
    {
      title: "Daily appointment volume",
      rows: data.dailyVolume.map((d) => ({ key: d.day, value: String(d.count) })),
    },
  ];
}

function buildFinancialSections(data: FinancialData): ReportSection[] {
  return [
    {
      title: "Revenue by category",
      rows: data.revenueByCategory.map((r) => ({ key: r.sourceType, value: money(r.revenueCents) })),
    },
    {
      title: "Consultation revenue by department",
      rows: data.consultationByDepartment.map((r) => ({
        key: r.departmentName,
        value: money(r.revenueCents),
      })),
    },
    {
      title: "Bed revenue by department",
      rows: data.bedByDepartment.map((r) => ({ key: r.departmentName, value: money(r.revenueCents) })),
    },
    {
      title: "Outstanding balance",
      rows: [{ key: "Total outstanding", value: money(data.outstandingBalanceCents) }],
    },
    {
      title: "Insurance claims by status",
      rows: data.claimsByStatus.map((r) => ({ key: r.status, value: String(r.count) })),
    },
  ];
}

function buildClinicalSections(data: ClinicalData): ReportSection[] {
  return [
    {
      title: data.doctorId ? "Top diagnoses (this doctor)" : "Top diagnoses (hospital-wide)",
      rows: data.topDiagnoses.map((d) => ({
        key: `${d.icdCode ?? "—"} ${d.description}`.trim(),
        value: String(d.count),
      })),
    },
    {
      title: "Prescription volume by day",
      rows: data.rxVolumeByDay.map((r) => ({ key: r.day, value: String(r.count) })),
    },
    {
      title: "Daily bed occupancy (hospital-wide)",
      rows: data.dailyBedOccupancy.map((r) => ({
        key: r.day,
        value:
          r.occupancyRate !== null
            ? `${r.occupiedBeds}/${r.totalBeds} (${(r.occupancyRate * 100).toFixed(1)}%)`
            : "No beds configured",
      })),
    },
  ];
}

function buildSections(reportType: ReportType, data: ReportData): ReportSection[] {
  if (reportType === "operational") return buildOperationalSections(data as OperationalData);
  if (reportType === "financial") return buildFinancialSections(data as FinancialData);
  return buildClinicalSections(data as ClinicalData);
}

export async function renderReportPdf(
  reportType: ReportType,
  data: ReportData,
  range: { start: Date; end: Date },
) {
  const sections = buildSections(reportType, data);

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.heading }, `MediCore — ${reportTitle(reportType)}`),
      React.createElement(
        Text,
        { style: styles.sub },
        `Range: ${formatDate(range.start)} – ${formatDate(range.end)}`,
      ),
      ...sections.map((s, i) =>
        React.createElement(KeyValueTable, { key: String(i), title: s.title, rows: s.rows }),
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        "Descriptive report generated by MediCore. No forecasting or predictive analytics applied.",
      ),
    ),
  );

  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
