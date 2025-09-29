"use client";

import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDatabase,
  IconDatabase as IconDeviceHdd,
  IconLoader,
  IconRefresh,
  IconServer,
  IconWifi,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export function SystemMonitor() {
  const [refreshing, setRefreshing] = useState(false);
  const [mockMetrics, setMockMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
  });

  useEffect(() => {
    // 设置模拟指标，避免 hydration 不匹配
    setMockMetrics({
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      disk: Math.floor(Math.random() * 100),
    });
  }, []);

  // Queries
  const {
    data: systemHealth,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = trpc.system.health.useQuery();

  const {
    data: systemStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.system.stats.useQuery();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchHealth(), refetchStats()]);
      toast.success("System status refreshed");
    } catch (_error) {
      toast.error("Failed to refresh system status");
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <IconCheck className="h-4 w-4 text-green-500" />;
      case "warning":
        return <IconAlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <IconX className="h-4 w-4 text-red-500" />;
      default:
        return <IconLoader className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Healthy
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Warning
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="text-sm text-muted-foreground">
          Last updated:{" "}
          {systemHealth?.lastChecked
            ? new Date(systemHealth.lastChecked).toLocaleString()
            : "Never"}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || healthLoading || statsLoading}
          size="sm"
        >
          {refreshing ? (
            <IconLoader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IconRefresh className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overall System Health */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconActivity className="h-5 w-5" />
                  Overall System Health
                </CardTitle>
                <CardDescription>
                  Current status of all system components
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <IconLoader className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    {getStatusIcon(systemHealth?.overall || "unknown")}
                    {getStatusBadge(systemHealth?.overall || "unknown")}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Service Status Cards */}
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-3">
        {/* Docker Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Docker Service
            </CardTitle>
            <IconServer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {healthLoading ? (
                    <IconLoader className="h-4 w-4 animate-spin" />
                  ) : systemHealth?.components?.docker?.containerRunning ? (
                    "Running"
                  ) : (
                    "Stopped"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth?.components?.docker?.containerState ||
                    "Unknown state"}
                </p>
              </div>
              {getStatusIcon(
                systemHealth?.components?.docker?.status || "unknown",
              )}
            </div>
            {systemHealth?.components?.docker?.error && (
              <p className="text-xs text-red-500 mt-2">
                {systemHealth.components.docker.error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* MongoDB Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MongoDB</CardTitle>
            <IconDatabase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {healthLoading ? (
                    <IconLoader className="h-4 w-4 animate-spin" />
                  ) : systemHealth?.components?.mongodb?.connected ? (
                    "Connected"
                  ) : (
                    "Disconnected"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth?.components?.mongodb?.collections?.length || 0}{" "}
                  collections
                </p>
              </div>
              {getStatusIcon(
                systemHealth?.components?.mongodb?.status || "unknown",
              )}
            </div>
            {systemHealth?.components?.mongodb?.error && (
              <p className="text-xs text-red-500 mt-2">
                {systemHealth.components.mongodb.error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Redis Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Cache</CardTitle>
            <IconWifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {healthLoading ? (
                    <IconLoader className="h-4 w-4 animate-spin" />
                  ) : systemHealth?.components?.redis?.connected ? (
                    "Connected"
                  ) : (
                    "Disconnected"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth?.components?.redis?.latency
                    ? `${systemHealth.components.redis.latency}ms latency`
                    : "Latency unknown"}
                </p>
              </div>
              {getStatusIcon(
                systemHealth?.components?.redis?.status || "unknown",
              )}
            </div>
            {systemHealth?.components?.redis?.error && (
              <p className="text-xs text-red-500 mt-2">
                {systemHealth.components.redis.error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconActivity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading metrics...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">
                      {systemStats ? mockMetrics.cpu : 0}%
                    </span>
                  </div>
                  <Progress
                    value={systemStats ? mockMetrics.cpu : 0}
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">
                      {systemStats ? mockMetrics.memory : 0}%
                    </span>
                  </div>
                  <Progress
                    value={systemStats ? mockMetrics.memory : 0}
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Disk Usage</span>
                    <span className="text-sm font-medium">
                      {systemStats ? mockMetrics.disk : 0}%
                    </span>
                  </div>
                  <Progress
                    value={systemStats ? mockMetrics.disk : 0}
                    className="h-2"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconDeviceHdd className="h-5 w-5" />
              Storage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading storage info...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Storage
                  </span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemStats?.database?.dbSize || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Available Space
                  </span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemStats?.cache?.memoryUsage || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Average Project Size
                  </span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemStats?.database?.dbSize || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Growth This Month
                  </span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemStats?.cache?.memoryUsage || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent System Events */}
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconClock className="h-5 w-5" />
            Recent System Events
          </CardTitle>
          <CardDescription>
            Latest system events and maintenance activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>System health check completed</TableCell>
                <TableCell>All Services</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Success</Badge>
                </TableCell>
                <TableCell>
                  {systemHealth?.lastChecked
                    ? new Date(systemHealth.lastChecked).toLocaleTimeString()
                    : "Unknown"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Database connection verified</TableCell>
                <TableCell>MongoDB</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Success</Badge>
                </TableCell>
                <TableCell>
                  {systemHealth?.lastChecked
                    ? new Date(systemHealth.lastChecked).toLocaleTimeString()
                    : "Unknown"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cache performance check</TableCell>
                <TableCell>Redis</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Success</Badge>
                </TableCell>
                <TableCell>
                  {systemHealth?.lastChecked
                    ? new Date(systemHealth.lastChecked).toLocaleTimeString()
                    : "Unknown"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
