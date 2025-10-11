"use client";

import { UsersList } from "@/components/features/users/users-list";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, create new accounts, and monitor user activity.
          </p>
        </div>
      </div>
      <UsersList />
    </div>
  );
}
