"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { MediCoreLogo } from "@/components/brand/MediCoreLogo";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { buttonPress } from "@/lib/microInteractions";
import { moveActivePill } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#departments", label: "Departments" },
  { href: "#doctors", label: "Doctors" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
] as const;

type NavHref = (typeof LINKS)[number]["href"];

export function MarketingNav({
  allowRegistration = true,
}: {
  allowRegistration?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavHref>(LINKS[0].href);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const registerWrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = navRef.current;
    const pill = pillRef.current;
    const target = itemRefs.current.get(active);
    if (!container || !pill || !target) return;
    moveActivePill(pill, target, container);
  }, [active]);

  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          const href = `#${visible.target.id}` as NavHref;
          if (LINKS.some((l) => l.href === href)) setActive(href);
        }
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: [0.15, 0.4] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = registerWrapRef.current;
    if (!el) return;
    const onDown = () => buttonPress(el);
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, [allowRegistration]);

  const navLinks = useMemo(() => LINKS, []);

  return (
    <header className="mkt-nav sticky top-0 z-40">
      <div className="mkt-nav__inner">
        <MediCoreLogo size="sm" href="/" />

        <nav
          ref={navRef}
          className="mkt-nav__links relative hidden items-center gap-0.5 md:flex"
          aria-label="Marketing"
        >
          <span
            ref={pillRef}
            aria-hidden
            className="mkt-nav__pill pointer-events-none absolute left-0 top-0"
            style={{ width: 0, height: 0 }}
          />
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              ref={(el) => {
                if (el) itemRefs.current.set(link.href, el);
                else itemRefs.current.delete(link.href);
              }}
              className={cn(
                "mkt-nav__link relative z-10",
                active === link.href && "mkt-nav__link--active",
              )}
              onClick={() => setActive(link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          {allowRegistration ? (
            <div ref={registerWrapRef} className="hidden sm:inline-flex">
              <Button asChild size="sm" className="mkt-nav__cta">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          ) : null}

          <Drawer open={open} onOpenChange={setOpen} direction="left">
            <DrawerTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent side="left" className="w-[min(20rem,92vw)]">
              <DrawerHeader>
                <DrawerTitle>Menu</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-1 px-4 pb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
                {allowRegistration ? (
                  <Link
                    href="/register"
                    className="rounded-md px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setOpen(false)}
                  >
                    Register
                  </Link>
                ) : null}
                <Link
                  href="/login"
                  className="mt-2 rounded-md px-3 py-2 text-xs text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  Staff sign-in
                </Link>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
