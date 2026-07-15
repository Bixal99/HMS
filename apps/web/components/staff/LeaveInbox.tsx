"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Button } from "@/components/ui/button";

type LeaveRow = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  staff: {
    user: { name: string | null; email: string };
    department: { name: string };
  };
};

export function LeaveInbox() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leave-requests", "PENDING"],
    queryFn: () =>
      apiFetch<{ data: LeaveRow[] }>("/api/staff/leave-requests?status=PENDING"),
    refetchInterval: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      apiFetch(`/api/staff/leave-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "APPROVED" ? "Leave approved" : "Leave rejected");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <PageEnter className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leave inbox</h1>
        <p className="text-sm text-muted-foreground">Approve or reject pending requests inline</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} label="Loading leave requests…" />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No pending leave requests" description="You're all caught up." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data!.data.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {row.staff.user.name || row.staff.user.email}
                </p>
                <p className="text-muted-foreground">
                  {row.staff.department.name} ·{" "}
                  {new Date(row.startDate).toLocaleDateString()} –{" "}
                  {new Date(row.endDate).toLocaleDateString()}
                </p>
                <p className="text-foreground">{row.reason}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: row.id, status: "APPROVED" })}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: row.id, status: "REJECTED" })}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageEnter>
  );
}
