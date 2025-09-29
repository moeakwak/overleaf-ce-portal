import { DashboardStats } from "@/components/features/dashboard/dashboard-stats";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
      <DashboardStats />
      <RecentActivity />
    </div>
  );
}
