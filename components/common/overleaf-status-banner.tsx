"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OverleafStatusBannerProps {
  isAdmin?: boolean;
}

export function OverleafStatusBanner({
  isAdmin = false,
}: OverleafStatusBannerProps) {
  return (
    <Alert
      variant="destructive"
      className="border-destructive/50 bg-destructive/10"
    >
      <IconAlertTriangle className="h-4 w-4" />
      <AlertTitle>Overleaf Instance Unavailable</AlertTitle>
      <AlertDescription>
        {isAdmin
          ? "The Overleaf instance is currently unavailable. Please check the Docker container, MongoDB, and Redis connections. Some features may not work correctly until the connection is restored."
          : "The Overleaf service is currently experiencing connection issues. Some features may be temporarily unavailable. Please contact your system administrator if this persists."}
      </AlertDescription>
    </Alert>
  );
}
