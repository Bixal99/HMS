import { redirect } from "next/navigation";
import { indexRedirectFor } from "@/lib/nav-index-routes";
import { homeForRole } from "@/lib/role-routes";
import { requireSessionUser } from "@/lib/session-user";

export default async function DashboardIndexPage() {
  const user = await requireSessionUser();
  redirect(indexRedirectFor("dashboard", user.role) ?? homeForRole(user.role));
}
