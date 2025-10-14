"use client";

import { IconReport, IconTool } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminSystemLogsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <IconReport className="h-6 w-6" />
            System Logs
          </h1>
          <p className="text-muted-foreground">
            View and analyze system logs and activity.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTool className="h-5 w-5" />
              Under Construction
            </CardTitle>
            <CardDescription>
              This page is currently under development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              System logs functionality will be available in a future version.
              This page will allow you to:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• View system logs in real-time</li>
              <li>• Filter logs by severity level</li>
              <li>• Search through historical logs</li>
              <li>• Export logs for analysis</li>
              <li>• Set up log alerts and notifications</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
