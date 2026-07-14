import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardHeroCardProps = {
  title: string;
  body: string;
  illustrationSrc?: string;
  className?: string;
  children?: React.ReactNode;
};

export function DashboardHeroCard({
  title,
  body,
  illustrationSrc = "/illustrations/auth-login.svg",
  className,
  children,
}: DashboardHeroCardProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardContent className="grid gap-4 p-0 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3 p-6">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {children}
        </div>
        <div className="relative hidden min-h-40 bg-primary/5 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={illustrationSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </CardContent>
    </Card>
  );
}
