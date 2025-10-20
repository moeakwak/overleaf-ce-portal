"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatUserId, getUserDisplayName, getUserFullName } from "@/lib/table-utils";

interface UserInfo {
  _id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  lastLoggedIn?: Date | string;
}

interface UserTooltipProps {
  user: UserInfo;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function UserTooltip({ user, children, side = "top" }: UserTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {getUserDisplayName(user)}
            </div>
            <div className="text-xs text-background/80">{user.email}</div>
            <div className="text-xs text-background/80">
              ID: {formatUserId(user._id)}
            </div>
            {user.lastLoggedIn && (
              <div className="text-xs text-background/80">
                Last login: {new Date(user.lastLoggedIn).toLocaleString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CollaboratorTooltipProps {
  readWriteUsers: UserInfo[];
  readOnlyUsers: UserInfo[];
  children: React.ReactNode;
}

export function CollaboratorTooltip({
  readWriteUsers,
  readOnlyUsers,
  children,
}: CollaboratorTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-3">
            {readWriteUsers.length > 0 && (
              <div>
                <div className="font-medium text-xs mb-2">
                  Read & Write ({readWriteUsers.length}):
                </div>
                <div className="space-y-1">
                  {readWriteUsers.map((user) => (
                    <div key={user._id} className="text-xs">
                      <div className="font-medium">
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-background/80">{user.email}</div>
                      <div className="text-background/80">
                        ID: {formatUserId(user._id)}
                      </div>
                      {user.lastLoggedIn && (
                        <div className="text-background/80">
                          Last login: {new Date(user.lastLoggedIn).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {readOnlyUsers.length > 0 && (
              <div>
                <div className="font-medium text-xs mb-2">
                  Read Only ({readOnlyUsers.length}):
                </div>
                <div className="space-y-1">
                  {readOnlyUsers.map((user) => (
                    <div key={user._id} className="text-xs">
                      <div className="font-medium">
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-background/80">{user.email}</div>
                      <div className="text-background/80">
                        ID: {formatUserId(user._id)}
                      </div>
                      {user.lastLoggedIn && (
                        <div className="text-background/80">
                          Last login: {new Date(user.lastLoggedIn).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
