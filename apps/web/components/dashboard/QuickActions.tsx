import Link from "next/link";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QuickAction = {
  href: string;
  label: string;
  variant?: "default" | "outline" | "secondary";
  icon?: ComponentType<{ className?: string }>;
};

type QuickActionsProps = {
  title?: string;
  actions: QuickAction[];
  className?: string;
};

export function QuickActions({
  title = "Quick actions",
  actions,
  className,
}: QuickActionsProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("flex flex-wrap gap-2", !title && "pt-6")}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.href + action.label} asChild variant={action.variant ?? "outline"}>
              <Link href={action.href}>
                {Icon ? <Icon className="size-4" /> : null}
                {action.label}
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
