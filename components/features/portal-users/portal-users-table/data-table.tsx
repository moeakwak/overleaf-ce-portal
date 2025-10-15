"use client";

import { IconSearch } from "@tabler/icons-react";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { createPortalUsersColumns, type PortalUserRow } from "./columns";

interface PortalUsersDataTableProps {
  data: PortalUserRow[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onEdit: (user: PortalUserRow) => void;
}

export function PortalUsersDataTable({
  data,
  loading,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  searchTerm,
  onPageChange,
  onSearchChange,
  onEdit,
}: PortalUsersDataTableProps) {
  const columns = createPortalUsersColumns(onEdit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search portal users by name or email..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-80 pl-8"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No portal users found"
        defaultSorting={[{ id: "createdAt", desc: true }]}
      />

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
