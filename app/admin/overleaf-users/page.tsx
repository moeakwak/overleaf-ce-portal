"use client";

import { OverleafUsersList } from "@/components/features/overleaf-users/overleaf-users-list";

export default function AdminOverleafUsersPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Overleaf Users</h1>
          <p className="text-muted-foreground">
            Manage Overleaf CE accounts, provision new users, and review their
            activity.
          </p>
        </div>
      </div>
      <OverleafUsersList />
    </div>
  );
}
