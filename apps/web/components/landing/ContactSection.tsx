"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE, ApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  message: z.string().min(10, "Please write at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

export function ContactSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(`${API_BASE}/api/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        let message = res.statusText;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore
        }
        throw new ApiError(res.status, message);
      }
      toast.success("Message sent — we will follow up soon.");
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Send failed");
    }
  }

  return (
    <section id="contact" className="landing-section">
      <div className="mx-auto grid gap-10 lg:grid-cols-2">
        <div>
          <p className="mkt-section-kicker">Contact</p>
          <h2 className="landing-display mt-3">Talk with the care desk</h2>
          <p className="mkt-section-lead">
            Questions about registration, departments, or visiting hours? Send a
            note — the care desk will respond during business hours.
          </p>
        </div>
        <form
          className="mkt-contact-form space-y-3"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-phone">Phone (optional)</Label>
            <Input id="c-phone" {...register("phone")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-message">Message</Label>
            <textarea
              id="c-message"
              className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("message")}
            />
            {errors.message ? (
              <p className="text-xs text-destructive">
                {errors.message.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      </div>
    </section>
  );
}
