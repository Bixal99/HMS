import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { MedicineCatalogAdmin } from "@/components/admin/MedicineCatalogAdmin";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function AdminMedicinesPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <MedicineCatalogAdmin />
      </PageEnter>
    </AuthenticatedShell>
  );
}
