"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Package,
  Pill,
  Receipt,
  Scan,
  Settings,
  ShoppingCart,
  Stethoscope,
  Users,
  Wrench,
} from "lucide-react";
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
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { cn } from "@/lib/utils";
import { useSidebarBadges } from "@/lib/use-sidebar-badges";
import { useNavTrail } from "@/lib/use-nav-trail";
import type { BadgeKey } from "@/lib/sidebar-config";
import { homeForRole } from "@/lib/role-routes";

export type NavIconName =
  | "layout"
  | "users"
  | "stethoscope"
  | "calendar"
  | "clipboard"
  | "bed"
  | "activity"
  | "pill"
  | "cart"
  | "alert"
  | "flask"
  | "scan"
  | "package"
  | "wrench"
  | "receipt"
  | "file"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  icon?: NavIconName;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

const ICONS: Record<NavIconName, ComponentType<{ className?: string }>> = {
  layout: LayoutDashboard,
  users: Users,
  stethoscope: Stethoscope,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  bed: BedDouble,
  activity: Activity,
  pill: Pill,
  cart: ShoppingCart,
  alert: AlertTriangle,
  flask: FlaskConical,
  scan: Scan,
  package: Package,
  wrench: Wrench,
  receipt: Receipt,
  file: FileText,
  settings: Settings,
};

type AppShellProps = {
  user: { email: string; role: string; name?: string | null };
  navGroups: NavGroup[];
  children: React.ReactNode;
};

const HREF_BADGE_KEY: Record<string, BadgeKey> = {
  "/staff/leave": "leavePending",
  "/pharmacy/alerts": "pharmacyAlerts",
  "/pharmacy/queue": "pharmacyQueue",
  "/lab/queue": "labQueue",
  "/radiology/queue": "radiologyQueue",
  "/billing": "billingAlerts",
  "/inventory/alerts": "inventoryAlerts",
  "/appointments/pending": "appointmentPending",
};

function applyClientBadges(
  groups: NavGroup[],
  badges: Partial<Record<BadgeKey, number>>,
  role: string,
): NavGroup[] {
  const home = homeForRole(role);
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const path = item.href.split("?")[0] ?? item.href;
      let key = HREF_BADGE_KEY[path];
      if (!key && path === home && role === "PATIENT") {
        key = "patientUnpaid";
      }
      const count = key ? badges[key] : undefined;
      return {
        ...item,
        badge: count && count > 0 ? count : undefined,
      };
    }),
  }));
}

function NavList({
  navGroups,
  pathname,
  onNavigate,
  className,
}: {
  navGroups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const flat = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  const activeHref = useMemo(() => {
    const scored = flat
      .map((item) => {
        if (pathname === item.href) return { href: item.href, score: 1000 };
        if (pathname.startsWith(`${item.href}/`)) {
          return { href: item.href, score: item.href.length };
        }
        return null;
      })
      .filter(Boolean) as { href: string; score: number }[];
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.href ?? null;
  }, [flat, pathname]);

  return (
    <nav className={cn("space-y-5 px-3 py-4", className)}>
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon ? ICONS[item.icon] : null;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-active font-medium text-white"
                        : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-sidebar-accent"
                      />
                    ) : null}
                    {Icon ? (
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-sidebar-accent"
                            : "text-sidebar-muted group-hover:text-sidebar-foreground",
                        )}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({
  role,
  inverted,
}: {
  role: string;
  inverted?: boolean;
}) {
  return (
    <div className={cn("border-b px-4 py-4", inverted ? "border-sidebar-border" : "border-border")}>
      <MediCoreLogo
        size="sm"
        href="/"
        inverted={inverted}
        className={inverted ? "text-sidebar-foreground" : undefined}
      />
      <p
        className={cn(
          "mt-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
          inverted ? "text-sidebar-muted" : "text-muted-foreground",
        )}
      >
        {role.replace(/_/g, " ")}
      </p>
    </div>
  );
}

function SettingsNavLink({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === "/settings" || pathname.startsWith("/settings/");
  const Icon = ICONS.settings;
  return (
    <div className="border-t border-sidebar-border p-3">
      <Link
        href="/settings"
        prefetch
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-sidebar-active font-medium text-white"
            : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
        )}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-sidebar-accent"
          />
        ) : null}
        <Icon
          className={cn(
            "size-4 shrink-0",
            active
              ? "text-sidebar-accent"
              : "text-sidebar-muted group-hover:text-sidebar-foreground",
          )}
        />
        <span className="min-w-0 flex-1 truncate">Settings</span>
      </Link>
    </div>
  );
}

export function AppShell({ user, navGroups, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const clientBadges = useSidebarBadges(user.role);
  const resolvedNav = useMemo(
    () => applyClientBadges(navGroups, clientBadges, user.role),
    [navGroups, clientBadges, user.role],
  );
  const { crumbs, onCrumbNavigate } = useNavTrail(user.role);
  const displayName = user.name || user.email;
  const initials = initialsFromName(displayName);
  const tone = avatarToneClass(displayName);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const roleLabel = user.role.replace(/_/g, " ");

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBrand role={user.role} inverted />
        <NavList
          navGroups={resolvedNav}
          pathname={pathname}
          className="app-scroll flex-1 overflow-y-auto"
        />
        <SettingsNavLink pathname={pathname} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 pr-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <Drawer
                open={mobileOpen}
                onOpenChange={setMobileOpen}
                direction="left"
              >
                <DrawerTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Open navigation">
                    <Menu className="size-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent
                  side="left"
                  className="bg-sidebar text-sidebar-foreground"
                >
                  <SidebarBrand role={user.role} inverted />
                  <NavList
                    navGroups={resolvedNav}
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <SettingsNavLink
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </DrawerContent>
              </Drawer>
            </div>
            <nav aria-label="Breadcrumb" className="min-w-0 truncate text-base md:text-lg">
              <ol className="flex items-center gap-0">
                {crumbs.map((crumb, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center">
                      {i > 0 ? (
                        <span className="mx-1.5 shrink-0 text-muted-foreground/50" aria-hidden>
                          /
                        </span>
                      ) : null}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          onClick={(e) => {
                            e.preventDefault();
                            onCrumbNavigate(crumb.href!, i);
                          }}
                          className="truncate text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "truncate",
                            isLast
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground",
                          )}
                          aria-current={isLast ? "page" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <GlobalSearch role={user.role} navGroups={resolvedNav} />
            <NotificationCenter role={user.role} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex max-w-[14rem] items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left ring-offset-background transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="User menu"
                >
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      tone,
                    )}
                  >
                    {initials}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {displayName}
                    </span>
                    <span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                      {roleLabel}
                    </span>
                  </span>
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
          </div>
        </header>

        <main className="app-scroll h-0 min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 md:px-6 md:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
