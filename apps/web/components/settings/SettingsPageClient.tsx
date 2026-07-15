"use client";

import { Suspense } from "react";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { PageEnter } from "@/components/shared/PageEnter";
import { InlineLoader } from "@/components/shared/InlineLoader";

export function SettingsPageClient({ role }: { role: string }) {
  const isAdmin = role === "ADMIN";

  return (
    <PageEnter>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Manage your account and hospital configuration."
              : "Manage your account."}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </h2>
          <AccountSettingsForm />
        </section>

        {isAdmin ? (
          <section className="space-y-3 border-t border-border pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Hospital
            </h2>
            <Suspense fallback={<InlineLoader label="Loading hospital settings…" />}>
              <SettingsTabs embedded />
            </Suspense>
          </section>
        ) : null}
      </div>
    </PageEnter>
  );
}
