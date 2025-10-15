"use client";

import {
  IconLoader,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type RouterOutputs, trpc } from "@/lib/trpc/client";

type SystemStats = RouterOutputs["system"]["stats"];

export function DashboardStats() {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Initialize the current time to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString());

    // Optional: update the time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const {
    data: userStats,
    isLoading: userStatsLoading,
    error: userStatsError,
  } = trpc.overleafUser.getStats.useQuery();
  const {
    data: projectStats,
    isLoading: projectStatsLoading,
    error: projectStatsError,
  } = trpc.project.getStats.useQuery();
  const {
    data: systemStats,
    isLoading: systemStatsLoading,
    error: systemStatsError,
  } = trpc.system.stats.useQuery();

  const isLoading =
    userStatsLoading || projectStatsLoading || systemStatsLoading;
  const hasError = userStatsError || projectStatsError || systemStatsError;

  if (hasError) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="text-center">
            <CardDescription className="text-destructive">
              Failed to load statistics
            </CardDescription>
            <CardTitle className="text-sm">
              Please check system status
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Overleaf Users */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Overleaf Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <IconLoader className="size-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              userStats?.totalUsers?.toLocaleString() || "0"
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {userStats?.newUsersThisMonth
                ? `+${userStats.newUsersThisMonth}`
                : "+0"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {userStats?.newUsersThisMonth
              ? `${userStats.newUsersThisMonth} new this month`
              : "No new Overleaf users this month"}{" "}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {userStats?.activeUsers
              ? `${userStats.activeUsers} active Overleaf users`
              : "Overleaf user activity tracking"}
          </div>
        </CardFooter>
      </Card>

      {/* Total Projects */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <IconLoader className="size-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              projectStats?.totalProjects?.toLocaleString() || "0"
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {projectStats?.projectsThisMonth
                ? `+${projectStats.projectsThisMonth}`
                : "+0"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {projectStats?.projectsThisMonth
              ? `${projectStats.projectsThisMonth} new this month`
              : "No new projects this month"}{" "}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {projectStats?.activeProjects
              ? `${projectStats.activeProjects} active projects`
              : "Project activity tracking"}
          </div>
        </CardFooter>
      </Card>

      {/* Storage Used */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Storage Used</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <IconLoader className="size-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              formatBytes(systemStats?.database?.dbSize || 0)
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {systemStats?.database?.collections?.length
                ? `${systemStats.database.collections.length} collections`
                : "0 collections"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Storage growth tracking <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {systemStats?.database?.dbSize
              ? `DB Size: ${formatBytes(systemStats.database.dbSize)}`
              : "Storage analytics"}
          </div>
        </CardFooter>
      </Card>

      {/* System Health */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>System Health</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <IconLoader className="size-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              getHealthPercentage(systemStats)
            )}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={getHealthBadgeColor(systemStats)}
            >
              {getHealthIcon(systemStats)}
              {getHealthStatus(systemStats)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            All systems operational {getHealthIcon(systemStats)}
          </div>
          <div className="text-muted-foreground">
            Last checked: {currentTime || "--:--:--"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getHealthPercentage(systemStats: SystemStats | undefined): string {
  if (!systemStats) return "—";
  // Calculate health percentage based on non-zero stats
  const statsCount =
    (systemStats.users.totalUsers > 0 ? 1 : 0) +
    (systemStats.projects.totalProjects > 0 ? 1 : 0) +
    (systemStats.database.dbSize > 0 ? 1 : 0);
  const total = 3;
  return `${Math.round((statsCount / total) * 100)}%`;
}

function getHealthStatus(systemStats: SystemStats | undefined): string {
  if (!systemStats) return "Unknown";
  // Calculate health percentage based on non-zero stats
  const statsCount =
    (systemStats.users.totalUsers > 0 ? 1 : 0) +
    (systemStats.projects.totalProjects > 0 ? 1 : 0) +
    (systemStats.database.dbSize > 0 ? 1 : 0);
  const total = 3;
  const percentage = (statsCount / total) * 100;

  if (percentage === 100) return "Healthy";
  if (percentage >= 80) return "Warning";
  return "Critical";
}

function getHealthIcon(systemStats: SystemStats | undefined) {
  const status = getHealthStatus(systemStats);
  if (status === "Healthy") return <IconTrendingUp className="size-3" />;
  if (status === "Warning") return <IconTrendingUp className="size-3" />;
  return <IconTrendingDown className="size-3" />;
}

function getHealthBadgeColor(systemStats: SystemStats | undefined): string {
  const status = getHealthStatus(systemStats);
  if (status === "Healthy") return "text-green-600 border-green-200";
  if (status === "Warning") return "text-yellow-600 border-yellow-200";
  return "text-red-600 border-red-200";
}
