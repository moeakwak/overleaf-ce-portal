import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/table-utils";

type OverleafUser = {
  _id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  lastLoggedIn?: Date | string;
};

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

interface UserBadgeProps {
  user: OverleafUser | null | undefined;
  className?: string;
  variant?: BadgeVariant;
  side?: "top" | "bottom" | "left" | "right";
  fallbackLabel?: string;
}

export function UserBadge({
  user,
  className,
  variant = "outline",
  side = "top",
  fallbackLabel = "Unknown user",
}: UserBadgeProps) {
  if (!user) {
    return (
      <Badge variant={variant} className={className}>
        {fallbackLabel}
      </Badge>
    );
  }

  const displayName = getUserDisplayName({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  });
  const lastLogin =
    user.lastLoggedIn instanceof Date
      ? user.lastLoggedIn
      : user.lastLoggedIn
        ? new Date(user.lastLoggedIn)
        : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className={cn("cursor-help", className)}>
            {displayName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <div className="space-y-1 text-xs">
            <div className="font-medium text-sm">
              {displayName}
            </div>
            <div className="text-background/80">ID: {user._id}</div>
            <div className="text-background/80">Email: {user.email}</div>
            {lastLogin ? (
              <div className="text-background/80">
                Last login: {lastLogin.toLocaleString()}
              </div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
