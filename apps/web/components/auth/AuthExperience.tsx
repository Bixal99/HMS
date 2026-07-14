"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { toast } from "sonner";
import { MediCoreLogo } from "@/components/brand/MediCoreLogo";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/(auth)/login/actions";
import { registerPatientAction } from "@/app/(auth)/register/actions";
import { buttonPress } from "@/lib/microInteractions";
import { cn } from "@/lib/utils";
import "@/components/landing/landing.css";

gsap.registerPlugin(useGSAP);

type AuthMode = "login" | "register";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function EcgPulse({ pathRef }: { pathRef: React.RefObject<SVGPathElement | null> }) {
  return (
    <svg
      className="auth-ecg pointer-events-none absolute inset-x-0 bottom-6 h-14 w-full opacity-70"
      viewBox="0 0 600 64"
      fill="none"
      aria-hidden
    >
      <path
        ref={pathRef}
        d="M0 32 H80 L95 32 L110 8 L130 56 L150 32 H220 L235 32 L250 12 L270 52 L290 32 H600"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}

type FormPanelProps = {
  mode: AuthMode;
  pending: boolean;
  onLogin: (formData: FormData) => void;
  onRegister: (formData: FormData) => void;
  onSwitch: (mode: AuthMode) => void;
};

function AuthModeTabs({
  mode,
  onSwitch,
  idPrefix,
}: {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
  idPrefix: string;
}) {
  const isRegister = mode === "register";
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      role="tablist"
      aria-label="Authentication mode"
    >
      <button
        type="button"
        role="tab"
        id={`${idPrefix}-tab-login`}
        aria-selected={!isRegister}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          !isRegister
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onSwitch("login")}
      >
        Sign in
      </button>
      <button
        type="button"
        role="tab"
        id={`${idPrefix}-tab-register`}
        aria-selected={isRegister}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isRegister
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onSwitch("register")}
      >
        Create account
      </button>
    </div>
  );
}

function RegisterFormPanel({
  mode,
  pending,
  onRegister,
  onSwitch,
  className,
}: FormPanelProps & { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center bg-background p-4 sm:p-6",
        className,
      )}
    >
      <div className="w-full max-w-md">
        <div className="mb-4 lg:hidden">
          <MediCoreLogo size="sm" href="/" />
        </div>
        <AuthModeTabs mode={mode} onSwitch={onSwitch} idPrefix="register" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Create account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Patients only</p>

        <form action={onRegister} className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-2">
          <div className="space-y-0.5">
            <Label htmlFor="firstName" className="text-xs">
              First name
            </Label>
            <Input id="firstName" name="firstName" required className="h-8" />
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="lastName" className="text-xs">
              Last name
            </Label>
            <Input id="lastName" name="lastName" required className="h-8" />
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label htmlFor="reg-email" className="text-xs">
              Email
            </Label>
            <Input id="reg-email" name="email" type="email" required className="h-8" />
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label htmlFor="reg-password" className="text-xs">
              Password
            </Label>
            <PasswordField
              id="reg-password"
              autoComplete="new-password"
              required
              minLength={8}
              className="[&_input]:h-8"
            />
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="dob" className="text-xs">
              Date of birth
            </Label>
            <Input id="dob" name="dob" type="date" required className="h-8" />
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="gender" className="text-xs">
              Gender
            </Label>
            <select
              id="gender"
              name="gender"
              required
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label htmlFor="phone" className="text-xs">
              Phone
            </Label>
            <Input id="phone" name="phone" type="tel" required className="h-8" />
          </div>
          <Button type="submit" className="col-span-2 mt-1 h-9" disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function LoginFormPanel({
  mode,
  pending,
  onLogin,
  onSwitch,
  className,
}: FormPanelProps & { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center bg-background p-4 sm:p-6",
        className,
      )}
    >
      <div className="w-full max-w-sm">
        <div className="mb-4 lg:hidden">
          <MediCoreLogo size="sm" href="/" />
        </div>
        <AuthModeTabs mode={mode} onSwitch={onSwitch} idPrefix="login" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your hospital account credentials
        </p>

        <form action={onLogin} className="mt-5 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <PasswordField id="password" autoComplete="current-password" required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="rememberMe" name="rememberMe" value="on" />
            <Label htmlFor="rememberMe" className="font-normal text-muted-foreground">
              Remember me
            </Label>
          </div>
          <Button
            type="submit"
            className="h-9 w-full"
            disabled={pending}
            onMouseDown={(e) => buttonPress(e.currentTarget)}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AuthExperience({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<AuthMode>(
    modeParam === "register" || initialMode === "register" ? "register" : "login",
  );
  const [pending, startTransition] = useTransition();
  const overlayRef = useRef<HTMLElement>(null);
  const brandContentRef = useRef<HTMLDivElement>(null);
  const ecgRef = useRef<SVGPathElement>(null);
  const isFirstSlide = useRef(true);

  useEffect(() => {
    if (modeParam === "register") setMode("register");
    else setMode("login");
  }, [modeParam]);

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const reduced = prefersReducedMotion();
      const target = mode === "register" ? 100 : 0;

      if (isFirstSlide.current) {
        gsap.set(overlay, { xPercent: target });
        isFirstSlide.current = false;

        if (ecgRef.current && !reduced) {
          gsap.fromTo(
            ecgRef.current,
            { strokeDasharray: 1, strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              duration: 2.4,
              ease: "power1.inOut",
              repeat: -1,
              repeatDelay: 0.6,
            },
          );
          gsap.to(ecgRef.current, {
            opacity: 0.35,
            duration: 1.2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        }
        return;
      }

      gsap.to(overlay, {
        xPercent: target,
        duration: reduced ? 0 : 0.65,
        ease: "power2.inOut",
      });

      if (brandContentRef.current) {
        gsap.fromTo(
          brandContentRef.current.querySelectorAll("[data-brand-fade]"),
          { opacity: 0, y: reduced ? 0 : 10 },
          {
            opacity: 1,
            y: 0,
            duration: reduced ? 0 : 0.4,
            stagger: 0.06,
            delay: reduced ? 0 : 0.15,
            ease: "power2.out",
          },
        );
      }
    },
    { dependencies: [mode], scope: overlayRef },
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    router.replace(next === "register" ? "/login?mode=register" : "/login", {
      scroll: false,
    });
  }

  function onLogin(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        rememberMe: formData.get("rememberMe") === "on",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      try {
        sessionStorage.setItem("medicore:auth-welcome", "back");
      } catch {
        // ignore
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  function onRegister(formData: FormData) {
    startTransition(async () => {
      const result = await registerPatientAction({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        dob: String(formData.get("dob") ?? ""),
        gender: String(formData.get("gender") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      try {
        sessionStorage.setItem("medicore:auth-welcome", "new");
      } catch {
        // ignore
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  const isRegister = mode === "register";
  const formProps = { mode, pending, onLogin, onRegister, onSwitch: switchMode };

  return (
    <main className="auth-slide-shell relative min-h-svh overflow-hidden">
      {/* Mobile brand strip */}
      <div className="auth-brand-panel relative px-5 py-4 text-primary-foreground lg:hidden">
        <MediCoreLogo size="sm" href="/" inverted className="text-primary-foreground" />
        <p className="mt-3 text-base font-semibold leading-snug">
          {isRegister
            ? "Create an account to explore features."
            : "Log in to explore features."}
        </p>
      </div>

      {/* Forms layer: register left, login right (desktop) */}
      <div className="auth-slide-forms relative min-h-[calc(100svh-5.5rem)] lg:min-h-svh">
        {/* Desktop dual columns */}
        <div className="hidden h-full min-h-svh lg:grid lg:grid-cols-2">
          <RegisterFormPanel {...formProps} />
          <LoginFormPanel {...formProps} />
        </div>

        {/* Mobile: single active form */}
        <div className="lg:hidden">
          {isRegister ? (
            <RegisterFormPanel {...formProps} />
          ) : (
            <LoginFormPanel {...formProps} />
          )}
        </div>
      </div>

      {/* Sliding brand overlay (desktop only) */}
      <aside
        ref={overlayRef}
        className="auth-brand-panel auth-slide-overlay absolute inset-y-0 left-0 z-20 hidden w-1/2 flex-col lg:flex"
        aria-hidden={false}
      >
        <div className="auth-brand-panel__grid" aria-hidden />
        <div
          ref={brandContentRef}
          className="relative flex h-full flex-col justify-between p-10 text-primary-foreground"
        >
          <div data-brand-fade>
            <MediCoreLogo size="lg" href="/" inverted className="text-primary-foreground" />
          </div>

          <div className="relative pb-8">
            <h1
              data-brand-fade
              className="landing-display max-w-md text-3xl font-semibold leading-tight xl:text-4xl"
            >
              {isRegister
                ? "Create an account to explore features."
                : "Log in to explore features."}
            </h1>
            <p
              data-brand-fade
              className="mt-3 max-w-sm text-sm text-primary-foreground/80"
            >
              {isRegister
                ? "Patients can self-register once; staff accounts are provisioned by admins."
                : "Access queues, clinical tools, and care workflows for your role."}
            </p>
            <div
              data-brand-fade
              className="relative mt-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={isRegister ? "register" : "login"}
                src={
                  isRegister
                    ? "/illustrations/auth-register.svg"
                    : "/illustrations/auth-login.svg"
                }
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <EcgPulse pathRef={ecgRef} />
          </div>
        </div>
      </aside>
    </main>
  );
}
