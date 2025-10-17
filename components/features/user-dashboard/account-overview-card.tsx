"use client";

import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatusDescriptor = {
  tone: "success" | "info" | "warning" | "danger";
  title: string;
  description: string;
};

const toneStyles: Record<StatusDescriptor["tone"], string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export function AccountOverviewCard({
  status,
}: {
  status: StatusDescriptor | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status ? (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                toneStyles[status.tone],
              )}
            >
              {status.tone === "success" ? (
                <IconCheck className="h-5 w-5" />
              ) : (
                <IconAlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-lg font-medium">{status.title}</h2>
              <p className="text-sm text-muted-foreground">
                {status.description}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
