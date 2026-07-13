import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  heading: { fontSize: 18, marginBottom: 4, color: "#1a5cd6", fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 9, color: "#666", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: { flexDirection: "row", paddingVertical: 3 },
  colDesc: { width: "46%" },
  colQty: { width: "12%", textAlign: "right" },
  colUnit: { width: "20%", textAlign: "right" },
  colTotal: { width: "22%", textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3, width: "50%" },
  totalLabel: { width: "50%", textAlign: "right", paddingRight: 8, color: "#555" },
  totalValue: { width: "50%", textAlign: "right" },
  footer: { marginTop: 28, fontSize: 8, color: "#888" },
  bold: { fontFamily: "Helvetica-Bold" },
});

export type InvoicePdfData = {
  id: string;
  status: string;
  createdAt: Date | string;
  issuedAt?: Date | string | null;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  patient: {
    firstName: string;
    lastName: string;
    mrn: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    sourceType: string;
  }>;
  payments: Array<{
    method: string;
    amountCents: number;
    paidAt: Date | string;
  }>;
};

export type PdfBranding = {
  hospitalName: string;
  brandColorHex: string;
  logoUrl?: string | null;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function InvoiceDocument({
  invoice,
  branding,
}: {
  invoice: InvoicePdfData;
  branding: PdfBranding;
}) {
  const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
  const balance = Math.max(0, invoice.totalCents - paid);
  const headingStyle = { ...styles.heading, color: branding.brandColorHex };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        Text,
        { style: headingStyle },
        `${branding.hospitalName} — Invoice`,
      ),
      React.createElement(
        Text,
        { style: styles.sub },
        `Invoice ${invoice.id.slice(0, 8).toUpperCase()} · Status: ${invoice.status}`,
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          Text,
          null,
          `Patient: ${invoice.patient.firstName} ${invoice.patient.lastName}`,
        ),
        React.createElement(Text, null, `MRN: ${invoice.patient.mrn}`),
        React.createElement(Text, null, `Created: ${formatDate(invoice.createdAt)}`),
        invoice.issuedAt
          ? React.createElement(Text, null, `Issued: ${formatDate(invoice.issuedAt)}`)
          : null,
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.label }, "Line items"),
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.colDesc, styles.bold] }, "Description"),
          React.createElement(Text, { style: [styles.colQty, styles.bold] }, "Qty"),
          React.createElement(Text, { style: [styles.colUnit, styles.bold] }, "Unit"),
          React.createElement(Text, { style: [styles.colTotal, styles.bold] }, "Total"),
        ),
        ...invoice.items.map((item, i) =>
          React.createElement(
            View,
            { key: String(i), style: styles.tableRow },
            React.createElement(Text, { style: styles.colDesc }, item.description),
            React.createElement(Text, { style: styles.colQty }, String(item.quantity)),
            React.createElement(Text, { style: styles.colUnit }, money(item.unitPriceCents)),
            React.createElement(Text, { style: styles.colTotal }, money(item.lineTotalCents)),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.totals },
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: styles.totalLabel }, "Subtotal"),
          React.createElement(Text, { style: styles.totalValue }, money(invoice.subtotalCents)),
        ),
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: styles.totalLabel }, "Tax"),
          React.createElement(Text, { style: styles.totalValue }, money(invoice.taxCents)),
        ),
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: styles.totalLabel }, "Discount"),
          React.createElement(Text, { style: styles.totalValue }, money(invoice.discountCents)),
        ),
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: [styles.totalLabel, styles.bold] }, "Total"),
          React.createElement(
            Text,
            { style: [styles.totalValue, styles.bold] },
            money(invoice.totalCents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: styles.totalLabel }, "Paid"),
          React.createElement(Text, { style: styles.totalValue }, money(paid)),
        ),
        React.createElement(
          View,
          { style: styles.totalLine },
          React.createElement(Text, { style: [styles.totalLabel, styles.bold] }, "Balance"),
          React.createElement(Text, { style: [styles.totalValue, styles.bold] }, money(balance)),
        ),
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        `Please settle any outstanding balance at the billing desk. Generated by ${branding.hospitalName}.`,
      ),
    ),
  );
}

export async function renderInvoicePdf(
  invoice: InvoicePdfData,
  branding: PdfBranding = {
    hospitalName: "MediCore",
    brandColorHex: "#1a5cd6",
  },
) {
  const doc = React.createElement(InvoiceDocument, { invoice, branding });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
