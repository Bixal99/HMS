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
import { registerPatientAction } from "./actions";
import "@/components/landing/landing.css";

const PATIENT_STEPS = [
  {
    icon: UserPlus,
    title: "Register",
    text: "Create your patient profile once — it becomes your hospital identity.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    text: "Choose a clinician and slot; reception and the queue update automatically.",
  },
  {
    icon: ClipboardList,
    title: "Portal",
    text: "Review visit summaries and keep follow-ups in one place.",
  },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
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
              Patient self-registration
            </h1>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
              Staff accounts are provisioned by administrators — this form is for patients
              only. Register once; appointments, visits, and results stay in sync.
            </p>
            <ul className="mt-8 space-y-5">
              {PATIENT_STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-primary-foreground/80">
                        {item.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background p-6">
        <form action={onSubmit} className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
          <div className="space-y-3 sm:col-span-2 lg:hidden">
            <MediCoreLogo size="md" href="/" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <h2 className="text-2xl font-semibold text-foreground">Create account</h2>
            <p className="text-sm text-muted-foreground">Patients only</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" name="dob" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" required />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground sm:col-span-2">
            Already registered?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
