import { redirect } from "next/navigation";
import { indexRedirectFor } from "@/lib/nav-index-routes";
import { homeForRole } from "@/lib/role-routes";
import { requireSessionUser } from "@/lib/session-user";

export default async function ReportsIndexPage() {
  const user = await requireSessionUser();
  redirect(indexRedirectFor("reports", user.role) ?? homeForRole(user.role));
}
