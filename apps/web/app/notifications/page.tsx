import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { NotificationsHistory } from "@/components/notifications/NotificationsHistory";
import { requireSessionUser } from "@/lib/session-user";

export default async function NotificationsPage() {
  const user = await requireSessionUser();

  return (
    <AuthenticatedShell>
      <NotificationsHistory role={user.role} />
    </AuthenticatedShell>
  );
}
