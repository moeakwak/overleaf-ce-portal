"use client";

import { IconSearch } from "@tabler/icons-react";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { createUsersColumns, type User } from "./columns";

interface UsersDataTableProps {
  data: User[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onViewDetails: (user: User) => void;
  onDelete: (email: string) => void;
}

export function UsersDataTable({
  data,
  loading,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  searchTerm,
  onPageChange,
  onSearchChange,
  onViewDetails,
  onDelete,
}: UsersDataTableProps) {
  const columns = createUsersColumns(onViewDetails, onDelete);

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 w-80"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No users found"
        defaultSorting={[{ id: "lastLoggedIn", desc: true }]}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
