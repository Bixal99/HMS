import { WelcomeBackBanner } from "@/components/dashboard/WelcomeBackBanner";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  /** Kept for callers; page title lives in the navbar breadcrumb. */
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function DashboardShell({
  children,
  className,
}: DashboardShellProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <WelcomeBackBanner />
      {children}
    </div>
  );
}
