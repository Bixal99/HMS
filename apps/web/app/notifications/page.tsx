import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { NotificationsHistory } from "@/components/notifications/NotificationsHistory";
import { requireSessionUser } from "@/lib/session-user";

export default async function NotificationsPage() {
  await requireSessionUser();

  return (
    <AuthenticatedShell>
      <NotificationsHistory />
    </AuthenticatedShell>
  );
}
