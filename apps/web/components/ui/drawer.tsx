"use client";

import { Drawer as VaulDrawer } from "vaul";
import { cn } from "@/lib/utils";

type DrawerDirection = "left" | "right";

export function Drawer({
  open,
  onOpenChange,
  children,
  direction = "left",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  direction?: DrawerDirection;
}) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      {children}
    </VaulDrawer.Root>
  );
}

export const DrawerTrigger = VaulDrawer.Trigger;

export function DrawerContent({
  className,
  children,
  side = "left",
}: {
  className?: string;
  children: React.ReactNode;
  side?: DrawerDirection;
}) {
  return (
    <VaulDrawer.Portal>
      <VaulDrawer.Overlay className="fixed inset-0 z-40 bg-foreground/40 transition-opacity" />
      <VaulDrawer.Content
        className={cn(
          "fixed bottom-0 top-0 z-50 flex flex-col border-border bg-background outline-none",
          side === "right"
            ? "right-0 border-l w-[min(18rem,85vw)]"
            : "left-0 border-r w-[min(18rem,85vw)]",
          className,
        )}
      >
        {children}
      </VaulDrawer.Content>
    </VaulDrawer.Portal>
  );
}

export function DrawerHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("border-b border-border px-4 py-3", className)}>{children}</div>;
}

export function DrawerTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <VaulDrawer.Title className={cn("text-base font-semibold text-foreground", className)}>
      {children}
    </VaulDrawer.Title>
  );
}

export function DrawerDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <VaulDrawer.Description
      className={cn("mt-1 text-sm text-muted-foreground", className)}
    >
      {children}
    </VaulDrawer.Description>
  );
}

export function DrawerFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-auto flex gap-2 border-t border-border bg-background px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DrawerBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-4 py-4", className)}>{children}</div>
  );
}
