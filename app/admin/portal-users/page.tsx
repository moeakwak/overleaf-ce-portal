"use client";

import { PortalUsersList } from "@/components/features/portal-users/portal-users-list";

export default function AdminPortalUsersPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Portal Users</h1>
          <p className="text-muted-foreground">
            Manage portal accounts, assign roles, and link Overleaf users.
          </p>
        </div>
      </div>
      <PortalUsersList />
    </div>
  );
}
