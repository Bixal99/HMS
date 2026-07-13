import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  heading: { fontSize: 16, marginBottom: 12, color: "#1a5cd6" },
  section: { marginBottom: 10 },
  label: { fontSize: 10, color: "#555", marginBottom: 2 },
  body: { marginBottom: 6, lineHeight: 1.4 },
  footer: { marginTop: 24, fontSize: 9, color: "#888" },
});

type PdfEncounter = {
  encounterDate: Date | string;
  chiefComplaint?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  status: string;
  finalizedAt?: Date | string | null;
  diagnoses?: Array<{ icdCode?: string | null; description: string }>;
  vitals?: Array<{
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    temperatureC?: number | null;
    pulseBpm?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
    recordedAt: Date | string;
  }>;
  prescriptions?: Array<{
    items: Array<{
      dosage: string;
      frequency: string;
      durationDays: number;
      medicine: { name: string; strength: string };
    }>;
  }>;
};

type PdfPatient = {
  firstName: string;
  lastName: string;
  mrn: string;
};

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function soapBlock(label: string, text?: string | null) {
  return React.createElement(
    View,
    { style: styles.section, key: label },
    React.createElement(Text, { style: styles.label }, label),
    React.createElement(Text, { style: styles.body }, text?.trim() || "—"),
  );
}

export function VisitSummaryDocument({
  encounter,
  patient,
  branding = {
    hospitalName: "MediCore",
    brandColorHex: "#1a5cd6",
  },
}: {
  encounter: PdfEncounter;
  patient: PdfPatient;
  branding?: { hospitalName: string; brandColorHex: string };
}) {
  const latestVitals = encounter.vitals?.[0];
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
        `${branding.hospitalName} — Visit Summary`,
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          Text,
          null,
          `Patient: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`,
        ),
        React.createElement(Text, null, `Date: ${formatDate(encounter.encounterDate)}`),
        React.createElement(Text, null, `Status: ${encounter.status}`),
        encounter.chiefComplaint
          ? React.createElement(Text, null, `Chief complaint: ${encounter.chiefComplaint}`)
          : null,
      ),
      soapBlock("Subjective", encounter.subjective),
      soapBlock("Objective", encounter.objective),
      soapBlock("Assessment", encounter.assessment),
      soapBlock("Plan", encounter.plan),
      latestVitals
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.label }, "Latest vitals"),
            React.createElement(
              Text,
              { style: styles.body },
              [
                latestVitals.bpSystolic != null && latestVitals.bpDiastolic != null
                  ? `BP ${latestVitals.bpSystolic}/${latestVitals.bpDiastolic}`
                  : null,
                latestVitals.pulseBpm != null ? `Pulse ${latestVitals.pulseBpm}` : null,
                latestVitals.temperatureC != null ? `Temp ${latestVitals.temperatureC}°C` : null,
                latestVitals.weightKg != null ? `Wt ${latestVitals.weightKg} kg` : null,
                latestVitals.heightCm != null ? `Ht ${latestVitals.heightCm} cm` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—",
            ),
          )
        : null,
      encounter.diagnoses && encounter.diagnoses.length > 0
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.label }, "Diagnoses"),
            ...encounter.diagnoses.map((d, i) =>
              React.createElement(
                Text,
                { key: String(i), style: styles.body },
                d.icdCode ? `${d.icdCode} — ${d.description}` : d.description,
              ),
            ),
          )
        : null,
      encounter.prescriptions && encounter.prescriptions.length > 0
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.label }, "Prescriptions"),
            ...encounter.prescriptions.flatMap((rx, ri) =>
              rx.items.map((item, ii) =>
                React.createElement(
                  Text,
                  { key: `${ri}-${ii}`, style: styles.body },
                  `${item.medicine.name} ${item.medicine.strength}: ${item.dosage}, ${item.frequency}, ${item.durationDays} day(s)`,
                ),
              ),
            ),
          )
        : null,
      React.createElement(
        Text,
        { style: styles.footer },
        `Generated by ${branding.hospitalName} · For clinical reference`,
      ),
    ),
  );
}

export async function renderVisitSummaryPdf(
  encounter: PdfEncounter,
  patient: PdfPatient,
  branding?: { hospitalName: string; brandColorHex: string },
) {
  const doc = React.createElement(VisitSummaryDocument, {
    encounter,
    patient,
    branding,
  });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
