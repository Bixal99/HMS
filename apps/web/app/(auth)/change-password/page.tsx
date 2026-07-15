import { redirect } from "next/navigation";
import { ForceChangePasswordForm } from "@/components/auth/ForceChangePasswordForm";
import { requireSessionUser } from "@/lib/session-user";
import { homeForRole } from "@/lib/role-routes";

export default async function ChangePasswordPage() {
  const user = await requireSessionUser();
  if (!user.mustChangePassword) {
    redirect(homeForRole(user.role));
  }
  return <ForceChangePasswordForm role={user.role} />;
}
