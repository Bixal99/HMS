import { redirect } from "next/navigation";
import { indexRedirectFor } from "@/lib/nav-index-routes";
import { homeForRole } from "@/lib/role-routes";
import { requireSessionUser } from "@/lib/session-user";

export default async function SurgeryIndexPage() {
  const user = await requireSessionUser();
  redirect(indexRedirectFor("surgery", user.role) ?? homeForRole(user.role));
}
