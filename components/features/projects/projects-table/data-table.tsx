"use client";

import { IconSearch } from "@tabler/icons-react";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { createProjectsColumns, type Project } from "./columns";

interface ProjectsDataTableProps {
  data: Project[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onViewDetails: (project: Project) => void;
  onExport: (project: Project) => void;
}

export function ProjectsDataTable({
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
  onExport,
}: ProjectsDataTableProps) {
  const columns = createProjectsColumns(onViewDetails, onExport);

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project name..."
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
        emptyMessage="No projects found"
        defaultSorting={[{ id: "lastUpdated", desc: true }]}
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
