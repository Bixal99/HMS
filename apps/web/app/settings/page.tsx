import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";
import { requireSessionUser } from "@/lib/session-user";

export default async function SettingsPage() {
  const user = await requireSessionUser();

  return (
    <AuthenticatedShell>
      <SettingsPageClient role={user.role} />
    </AuthenticatedShell>
  );
}
