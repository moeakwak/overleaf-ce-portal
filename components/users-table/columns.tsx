"use client";

import { IconEdit, IconMail, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createDateSortingFn,
  formatDateCell,
  formatUserId,
  getUserFullName,
} from "@/lib/table-utils";

export type User = {
  _id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  isAdmin: boolean;
  lastLoggedIn?: string | Date;
  loginCount?: number;
  signUpDate?: string | Date;
  emails?: Array<{ email: string; createdAt?: string | Date }>;
  features?: {
    collaborators?: number;
    compileTimeout?: number;
    versioning?: boolean;
    trackChanges?: boolean;
  };
  lastActive?: string | Date;
};

interface ActionsProps {
  user: User;
  onViewDetails: (user: User) => void;
  onDelete: (email: string) => void;
}

function ActionsCell({ user, onViewDetails, onDelete }: ActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconEdit className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(user)}>
          <IconMail className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <IconEdit className="mr-2 h-4 w-4" />
          Edit User
        </DropdownMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <IconTrash className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {user.email}? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(user.email)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createUsersColumns(
  onViewDetails: (user: User) => void,
  onDelete: (email: string) => void,
): ColumnDef<User>[] {
  return [
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{user.email}</div>
            <div className="text-xs text-muted-foreground">
              ID: {formatUserId(user._id)}
            </div>
          </div>
        );
      },
    },
    {
      id: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="font-medium">
            {getUserFullName(user, "Not provided")}
          </div>
        );
      },
    },
    {
      accessorKey: "isAdmin",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge variant={user.isAdmin ? "default" : "secondary"}>
            {user.isAdmin ? "Admin" : "User"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastLoggedIn",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ row }) => formatDateCell(row.original.lastLoggedIn),
      sortingFn: createDateSortingFn((user: User) => user.lastLoggedIn),
    },
    {
      accessorKey: "loginCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Login Count" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return user.loginCount || 0;
      },
    },
    {
      accessorKey: "signUpDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sign Up Date" />
      ),
      cell: ({ row }) => formatDateCell(row.original.signUpDate, "Unknown"),
      sortingFn: createDateSortingFn((user: User) => user.signUpDate),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-right">
            <ActionsCell
              user={user}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
            />
          </div>
        );
      },
    },
  ];
}
