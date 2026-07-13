import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function SettingsPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <SettingsTabs />
      </PageEnter>
    </AuthenticatedShell>
  );
}
