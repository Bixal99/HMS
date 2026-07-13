"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, ClipboardList, UserPlus } from "lucide-react";
import { MediCoreLogo } from "@/components/brand/MediCoreLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";
import { buttonPress } from "@/lib/microInteractions";
import "@/components/landing/landing.css";

const STAFF_POINTS = [
  {
    icon: UserPlus,
    text: "Manage patients, queues, and clinical workflows from one sign-in.",
  },
  {
    icon: CalendarCheck,
    text: "Appointments, pharmacy, lab, and wards stay synced in real time.",
  },
  {
    icon: ClipboardList,
    text: "Your role unlocks the right dashboard — nothing more, nothing less.",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="auth-brand-panel relative hidden lg:block">
        <div className="auth-brand-panel__grid" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <MediCoreLogo size="lg" href="/" inverted className="text-primary-foreground" />
          <div>
            <h1 className="landing-display text-4xl font-semibold leading-tight">
              Care operations, clarified.
            </h1>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
              Sign in to manage patients, staff availability, and clinical workflows.
            </p>
            <ul className="mt-8 space-y-4">
              {STAFF_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex gap-3 text-sm text-primary-foreground/85">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="leading-relaxed">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-3 lg:hidden">
            <MediCoreLogo size="md" href="/" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your hospital account credentials</p>
          </div>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={pending}
              onMouseDown={(e) => buttonPress(e.currentTarget)}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Patient?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
