"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { moveActivePill } from "@/lib/motion";
import { avatarToneClass, initialsFromName } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { logoutAction } from "@/app/(auth)/logout/actions";
import { MediCoreLogo } from "@/components/brand/MediCoreLogo";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

type AppShellProps = {
  user: { email: string; role: string; name?: string | null };
  nav: NavItem[];
  children: React.ReactNode;
};

function breadcrumbFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return ["Home"];
  return parts.map((p) => p.replace(/-/g, " "));
}

function NavList({
  nav,
  pathname,
  onNavigate,
  className,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  const activeHref = useMemo(() => {
    const match = nav.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return match?.href ?? nav[0]?.href;
  }, [nav, pathname]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    const target = activeHref ? itemRefs.current.get(activeHref) : null;
    if (!container || !pill || !target) return;
    moveActivePill(pill, target, container);
  }, [activeHref, nav]);

  return (
    <nav ref={containerRef} className={cn("relative space-y-1 p-3", className)}>
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-md bg-primary/10"
        style={{ width: 0, height: 0 }}
      />
      {nav.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              if (el) itemRefs.current.set(item.href, el);
              else itemRefs.current.delete(item.href);
            }}
            onClick={onNavigate}
            className={cn(
              "relative z-10 flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{item.label}</span>
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ user, nav, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = breadcrumbFromPath(pathname);
  const displayName = user.name || user.email;
  const initials = initialsFromName(displayName);
  const tone = avatarToneClass(displayName);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <MediCoreLogo size="sm" href="/" />
          <p className="mt-1 text-xs text-muted-foreground">{user.role}</p>
        </div>
        <NavList nav={nav} pathname={pathname} className="flex-1" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
                <DrawerTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Open navigation">
                    <Menu className="size-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="border-b border-border px-4 py-4">
                    <MediCoreLogo size="sm" href={null} />
                  </div>
                  <NavList
                    nav={nav}
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </DrawerContent>
              </Drawer>
            </div>
            <nav aria-label="Breadcrumb" className="text-sm capitalize text-muted-foreground">
              {crumbs.map((c, i) => (
                <span key={`${c}-${i}`}>
                  {i > 0 ? <span className="mx-1 text-border">/</span> : null}
                  <span className={i === crumbs.length - 1 ? "text-foreground" : undefined}>
                    {c}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                  tone,
                )}
                aria-label="User menu"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="opacity-70">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await logoutAction();
                  router.push("/login");
                  router.refresh();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
