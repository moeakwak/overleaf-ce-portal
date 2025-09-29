"use client";

import {
  IconDownload,
  IconEye,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollaboratorTooltip, UserTooltip } from "@/components/ui/user-tooltip";
import {
  createDateSortingFn,
  formatDateCell,
  formatUserId,
  getUserDisplayName,
} from "@/lib/table-utils";

export type Project = {
  _id: string;
  name?: string;
  owner_ref?: string;
  compiler?: string;
  collaberator_refs?: string[];
  readOnly_refs?: string[];
  lastUpdated?: string | Date;
  version?: number;
  spellCheckLanguage?: string;
  rootDoc_id?: string;
  publicAccesLevel?: string;
  tokens?: {
    readAndWrite?: string;
    readOnly?: string;
  };
  rootFolder?: any[];
  // Extended user info for owner and collaborators
  ownerUser?: {
    _id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  collaboratorUsers?: Array<{
    _id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    type: "read-write" | "read-only";
  }>;
};

interface CollaboratorsProps {
  project: Project;
}

function CollaboratorsCell({ project }: CollaboratorsProps) {
  const collaboratorCount =
    (project.collaberator_refs?.length || 0) +
    (project.readOnly_refs?.length || 0);

  // If we have detailed collaborator user info, show it with tooltip
  if (project.collaboratorUsers && project.collaboratorUsers.length > 0) {
    const readWriteUsers = project.collaboratorUsers.filter(
      (u) => u.type === "read-write",
    );
    const readOnlyUsers = project.collaboratorUsers.filter(
      (u) => u.type === "read-only",
    );

    const displayUsers = project.collaboratorUsers.slice(0, 3);
    const remainingCount = Math.max(0, collaboratorCount - 3);

    return (
      <CollaboratorTooltip
        readWriteUsers={readWriteUsers}
        readOnlyUsers={readOnlyUsers}
      >
        <div className="flex flex-col gap-1 cursor-help">
          <div className="flex items-center gap-1">
            <IconUsers className="h-3 w-3" />
            <span className="text-sm font-medium">{collaboratorCount}</span>
          </div>
          {collaboratorCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {displayUsers.map(getUserDisplayName).join(", ")}
              {remainingCount > 0 && `, +${remainingCount} more`}
            </div>
          )}
        </div>
      </CollaboratorTooltip>
    );
  }

  // Fallback to just showing count
  return (
    <div className="flex items-center gap-1">
      <IconUsers className="h-3 w-3" />
      <span className="text-sm">{collaboratorCount}</span>
    </div>
  );
}

interface ActionsProps {
  project: Project;
  onViewDetails: (project: Project) => void;
  onExport: (project: Project) => void;
}

function ActionsCell({ project, onViewDetails, onExport }: ActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconSettings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(project)}>
          <IconEye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport(project)}>
          <IconDownload className="mr-2 h-4 w-4" />
          Export Project
        </DropdownMenuItem>
        <DropdownMenuItem>
          <IconUsers className="mr-2 h-4 w-4" />
          View Collaborators
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createProjectsColumns(
  onViewDetails: (project: Project) => void,
  onExport: (project: Project) => void,
): ColumnDef<Project>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project" />
      ),
      cell: ({ row }) => {
        const project = row.original;
        const projectName = project.name || "Untitled Project";

        return (
          <div className="flex flex-col">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium max-w-[200px] truncate cursor-help">
                    {projectName}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="max-w-sm">
                    <div className="font-medium">{projectName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Full project name
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="text-xs text-muted-foreground">
              ID: {project._id.slice(-8)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "version",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Version" />
      ),
      cell: ({ row }) => {
        const project = row.original;
        return (
          <Badge variant="outline" className="text-xs">
            v{project.version || 1}
          </Badge>
        );
      },
    },
    {
      accessorKey: "owner_ref",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Owner" />
      ),
      cell: ({ row }) => {
        const project = row.original;

        if (project.ownerUser) {
          return (
            <UserTooltip user={project.ownerUser}>
              <div className="cursor-help">
                <div className="font-medium text-sm">
                  {getUserDisplayName(project.ownerUser)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatUserId(project.ownerUser._id)}
                </div>
              </div>
            </UserTooltip>
          );
        }

        return (
          <div className="text-sm text-muted-foreground">
            {project.owner_ref ? formatUserId(project.owner_ref) : "Unknown"}
          </div>
        );
      },
    },
    {
      accessorKey: "compiler",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Compiler" />
      ),
      cell: ({ row }) => {
        const project = row.original;
        return (
          <Badge variant="secondary">{project.compiler || "xelatex"}</Badge>
        );
      },
    },
    {
      id: "collaborators",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Collaborators" />
      ),
      cell: ({ row }) => {
        const project = row.original;
        return <CollaboratorsCell project={project} />;
      },
    },
    {
      accessorKey: "lastUpdated",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Updated" />
      ),
      cell: ({ row }) => formatDateCell(row.original.lastUpdated),
      sortingFn: createDateSortingFn((project: Project) => project.lastUpdated),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="text-right">
            <ActionsCell
              project={project}
              onViewDetails={onViewDetails}
              onExport={onExport}
            />
          </div>
        );
      },
    },
  ];
}
