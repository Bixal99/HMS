"use client";

import { Drawer as VaulDrawer } from "vaul";
import { cn } from "@/lib/utils";

export function Drawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onOpenChange} direction="left">
      {children}
    </VaulDrawer.Root>
  );
}

export const DrawerTrigger = VaulDrawer.Trigger;

export function DrawerContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <VaulDrawer.Portal>
      <VaulDrawer.Overlay className="fixed inset-0 z-40 bg-foreground/40 transition-opacity" />
      <VaulDrawer.Content
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-border bg-background outline-none",
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
