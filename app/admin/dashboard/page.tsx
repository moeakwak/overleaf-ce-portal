"use client";

import { OverleafStatusBanner } from "@/components/common/overleaf-status-banner";
import { DashboardStats } from "@/components/features/dashboard/dashboard-stats";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";
import { trpc } from "@/lib/trpc/client";

export default function AdminDashboardPage() {
  const { data: healthData } = trpc.system.health.useQuery();

  const showBanner =
    healthData && healthData.overleafInstanceAvailable === false;

  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
      {showBanner && <OverleafStatusBanner isAdmin={true} />}
      <DashboardStats />
      <RecentActivity />
    </div>
  );
}
