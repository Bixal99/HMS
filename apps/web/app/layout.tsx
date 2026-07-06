import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCore — Hospital Management System",
  description:
    "A production-grade, role-based Hospital Management System for patient intake, clinical documentation, appointment logistics, pharmacy dispensing, lab diagnostics, billing, and more.",
  keywords: [
    "hospital management",
    "healthcare",
    "EHR",
    "medical records",
    "appointment scheduling",
  ],
};

import { ClientProviders } from "@/components/ClientProviders";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
