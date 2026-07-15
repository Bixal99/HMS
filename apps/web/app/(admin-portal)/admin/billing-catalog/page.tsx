import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

const links = [
  {
    href: "/admin/medicines",
    title: "Medicine Management",
    body: "Catalog drugs and selling prices used by pharmacy fulfillment.",
  },
  {
    href: "/admin/lab-catalog",
    title: "Lab & Imaging Test Management",
    body: "Orderable lab and imaging tests, including FILE result types for imaging.",
  },
  {
    href: "/settings?tab=billing",
    title: "Hospital billing defaults",
    body: "Hospital-wide consultation fee and tax used when a doctor has no override.",
  },
  {
    href: "/settings?tab=users",
    title: "Per-doctor consultation fees",
    body: "Set optional consultationFeeCents when onboarding or reviewing doctors.",
  },
];

export default async function BillingCatalogPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Billing &amp; Service Catalog
            </h1>
            <p className="text-sm text-muted-foreground">
              Navigational rollup of existing catalogs — not a separate pricing
              model.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
                >
                  <p className="font-medium text-foreground">{link.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {link.body}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PageEnter>
    </AuthenticatedShell>
  );
}
