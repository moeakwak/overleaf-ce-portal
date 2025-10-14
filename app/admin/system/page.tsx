"use client";

import { SystemMonitor } from "@/components/features/system/system-monitor";

export default function AdminSystemPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health, check service status, and view system
            statistics.
          </p>
        </div>
      </div>
      <SystemMonitor />
    </div>
  );
}
