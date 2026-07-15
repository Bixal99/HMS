"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/auth/PasswordField";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";

type MeUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export function AccountSettingsForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users-me"],
    queryFn: () => apiFetch<MeUser>("/api/users/me"),
  });

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (data) setName(data.name ?? "");
  }, [data]);

  const saveName = useMutation({
    mutationFn: () =>
      apiFetch<MeUser>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      }),
    onSuccess: (updated) => {
      toast.success("Display name updated");
      void queryClient.invalidateQueries({ queryKey: ["users-me"] });
      setName(updated.name ?? "");
      router.refresh();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not update name"),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      apiFetch("/api/users/me/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      }),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : "Could not update password",
      ),
  });

  if (isLoading) {
    return <InlineLoader label="Loading account…" />;
  }
  if (isError || !data) {
    return (
      <QueryErrorState
        error={error ?? new Error("Account unavailable")}
        onRetry={() => void refetch()}
        title="Couldn’t load account"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={data.email} disabled readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-role">Role</Label>
            <Input
              id="account-role"
              value={data.role.replace(/_/g, " ")}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Display name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <Button
            type="button"
            disabled={saveName.isPending || !name.trim()}
            onClick={() => saveName.mutate()}
          >
            {saveName.isPending ? "Saving…" : "Save name"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordField
              id="current-password"
              name="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordField
              id="new-password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordField
              id="confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button
            type="button"
            disabled={
              changePassword.isPending ||
              !currentPassword ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
            onClick={() => {
              if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match");
                return;
              }
              changePassword.mutate();
            }}
          >
            {changePassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
