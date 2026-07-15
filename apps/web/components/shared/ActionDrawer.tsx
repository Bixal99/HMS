"use client";

import type { LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ActionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Default matches Equipment “Log service” width. */
  widthClass?: string;
  bodyClassName?: string;
};

/**
 * Canonical right action/detail drawer (Equipment pattern):
 * Header (icon + title + description) → scrollable Body → sticky Footer.
 * Do not put overflow/max-h on the content shell — Body handles scroll.
 */
export function ActionDrawer({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  footer,
  widthClass = "w-[min(26rem,94vw)]",
  bodyClassName,
}: ActionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent side="right" className={cn(widthClass, "shadow-xl")}>
        <DrawerHeader className="space-y-1 px-5 py-4">
          {Icon ? (
            <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={1.75} />
            </div>
          ) : null}
          <DrawerTitle>{title}</DrawerTitle>
          {description ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : null}
        </DrawerHeader>
        <DrawerBody className={cn("space-y-5 px-5", bodyClassName)}>
          {children}
        </DrawerBody>
        {footer ? <DrawerFooter className="px-5">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}
