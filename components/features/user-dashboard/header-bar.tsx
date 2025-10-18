"use client";

import { IconLoader, IconLogout, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type HeaderBarProps = {
  userName?: string | null;
  userEmail: string;
  userRole: string;
  isSigningOut: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onSignOut: () => void;
  onRefresh: () => void;
};

export function HeaderBar(props: HeaderBarProps) {
  const {
    userName,
    userEmail,
    userRole,
    isSigningOut,
    isFetching,
    isLoading,
    onSignOut,
    onRefresh,
  } = props;

  return (
    <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Welcome back, {userName ?? userEmail}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {userEmail ? `${userEmail}` : "No email found"}
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <Button
          variant="ghost"
          size="icon"
          title="Log Out"
          aria-label="Log Out"
          onClick={onSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <IconLoader className="h-4 w-4 animate-spin" />
          ) : (
            <IconLogout className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isFetching || isLoading}
        >
          {isFetching ? (
            <IconLoader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IconRefresh className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
        {userRole === "super-admin" ? (
          <Button asChild>
            <Link href="/admin/dashboard">Open Admin Portal</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
