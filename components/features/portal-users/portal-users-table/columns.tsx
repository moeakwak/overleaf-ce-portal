"use client";

import { IconEdit } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatDateCell } from "@/lib/table-utils";
import type { PortalUserRow } from "../portal-users-list";

export function createPortalUsersColumns(
  onEdit: (user: PortalUserRow) => void,
): ColumnDef<PortalUserRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.role === "super-admin" ? "default" : "secondary"
          }
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "overleafLinks",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Overleaf Links" />
      ),
      cell: ({ row }) => {
        const links = row.original.overleafLinks;
        if (!links.length) {
          return <span className="text-muted-foreground">No links</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {links.slice(0, 2).map((link) => (
              <Badge key={link.overleafUserId} variant="outline">
                {link.overleafUserEmail ?? link.overleafUserId.slice(-8)}
              </Badge>
            ))}
            {links.length > 2 && (
              <Badge variant="secondary">+{links.length - 2}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => formatDateCell(row.original.createdAt, "Unknown"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          <IconEdit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      ),
    },
  ];
}
