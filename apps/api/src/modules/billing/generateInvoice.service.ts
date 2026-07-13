import { differenceInCalendarDays } from "date-fns";
import { prisma } from "../../lib/prisma";
import { getSetting } from "../settings/settings.service";

export class NoBillableItemsError extends Error {
  constructor() {
    super("No billable items");
    this.name = "NoBillableItemsError";
  }
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type NewItem = {
  sourceType: "CONSULTATION" | "LAB" | "PHARMACY" | "BED" | "OTHER";
  sourceId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export async function generateInvoiceForPatient(patientId: string) {
  const consultationFeeCents = await getSetting<number>(
    "billing.consultationFeeCents",
  );
  const taxRatePercent = await getSetting<number>("billing.taxRatePercent");

  return prisma.$transaction(async (tx) => {
    const items: NewItem[] = [];
    const now = new Date();

    const encounters = await tx.encounter.findMany({
      where: { patientId, status: "FINALIZED", invoicedAt: null },
    });
    for (const enc of encounters) {
      items.push({
        sourceType: "CONSULTATION",
        sourceId: enc.id,
        description: `Consultation — ${formatDate(enc.encounterDate)}`,
        quantity: 1,
        unitPriceCents: consultationFeeCents,
        lineTotalCents: consultationFeeCents,
      });
      await tx.encounter.update({
        where: { id: enc.id },
        data: { invoicedAt: now },
      });
    }

    const dispenses = await tx.dispense.findMany({
      where: {
        invoicedAt: null,
        prescriptionItem: { prescription: { patientId } },
      },
      include: {
        prescriptionItem: { include: { medicine: true } },
      },
    });
    for (const d of dispenses) {
      const unitPrice = d.prescriptionItem.medicine.sellingPriceCents;
      const lineTotal = unitPrice * d.quantityDispensed;
      items.push({
        sourceType: "PHARMACY",
        sourceId: d.id,
        description: `${d.prescriptionItem.medicine.name} × ${d.quantityDispensed}`,
        quantity: d.quantityDispensed,
        unitPriceCents: unitPrice,
        lineTotalCents: lineTotal,
      });
      await tx.dispense.update({
        where: { id: d.id },
        data: { invoicedAt: now },
      });
    }

    const labItems = await tx.labOrderItem.findMany({
      where: {
        status: "RESULTED",
        invoicedAt: null,
        labOrder: { patientId },
      },
      include: { test: true },
    });
    for (const li of labItems) {
      items.push({
        sourceType: "LAB",
        sourceId: li.id,
        description: li.test.name,
        quantity: 1,
        unitPriceCents: li.test.priceCents,
        lineTotalCents: li.test.priceCents,
      });
      await tx.labOrderItem.update({
        where: { id: li.id },
        data: { invoicedAt: now },
      });
    }

    const admissions = await tx.admission.findMany({
      where: {
        patientId,
        dischargedAt: { not: null },
        invoicedAt: null,
      },
      include: { bed: true },
    });
    for (const adm of admissions) {
      const days = Math.max(
        1,
        differenceInCalendarDays(adm.dischargedAt!, adm.admittedAt),
      );
      const lineTotal = adm.bed.dailyRateCents * days;
      items.push({
        sourceType: "BED",
        sourceId: adm.id,
        description: `Bed ${adm.bed.bedNumber} × ${days} day(s)`,
        quantity: days,
        unitPriceCents: adm.bed.dailyRateCents,
        lineTotalCents: lineTotal,
      });
      await tx.admission.update({
        where: { id: adm.id },
        data: { invoicedAt: now },
      });
    }

    if (items.length === 0) {
      throw new NoBillableItemsError();
    }

    const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
    const taxCents = Math.round(subtotalCents * (taxRatePercent / 100));
    const totalCents = subtotalCents + taxCents;

    return tx.invoice.create({
      data: {
        patientId,
        subtotalCents,
        taxCents,
        discountCents: 0,
        totalCents,
        items: { create: items },
      },
      include: {
        items: true,
        payments: true,
        claims: true,
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            insuranceProvider: true,
            insurancePolicyNo: true,
          },
        },
      },
    });
  });
}
