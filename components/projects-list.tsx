"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconEye,
  IconFileText,
  IconFolder,
  IconLoader,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export function ProjectsList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, _setPageSize] = useState(25);
  const [searchName, setSearchName] = useState("");
  const [debouncedSearchName, setDebouncedSearchName] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastUpdated" | "owner_ref">(
    "lastUpdated",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [projectDetailsDrawerOpen, setProjectDetailsDrawerOpen] =
    useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Debounce search name
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchName(searchName);
      setCurrentPage(0); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchName]);

  // Reset page when sort changes
  useEffect(() => {
    setCurrentPage(0);
  }, []);

  // Queries
  const {
    data: projectsData,
    isLoading,
    refetch,
  } = trpc.project.list.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    searchName: debouncedSearchName || undefined,
    sortBy,
    sortOrder,
  });

  const { data: projectStats } = trpc.project.getStats.useQuery();

  // Mutations
  const exportProjectMutation = trpc.project.export.useMutation({
    onSuccess: (data) => {
      toast.success(`Project exported successfully to ${data.exportPath}`);
      setExportDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExportProject = (outputPath: string) => {
    if (!selectedProject) return;
    exportProjectMutation.mutate({
      projectId: selectedProject._id,
      outputPath,
    });
  };

  const handleViewProjectDetails = (project: any) => {
    setSelectedProject(project);
    setProjectDetailsDrawerOpen(true);
  };

  const totalPages = Math.ceil((projectsData?.total || 0) / pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with stats */}
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <IconFolder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectStats?.totalProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {projectStats?.projectsThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <IconFileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectStats?.activeProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collaborations
            </CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectStats?.totalProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">Multi-user projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by project name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value: any) => setSortBy(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastUpdated">Last Updated</SelectItem>
              <SelectItem value="name">Project Name</SelectItem>
              <SelectItem value="owner_ref">Owner</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(value: any) => setSortOrder(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <IconDownload className="mr-2 h-4 w-4" />
            Bulk Export
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Card className="mx-4 lg:mx-6">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading projects...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Compiler</TableHead>
                  <TableHead>Collaborators</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsData?.projects?.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium max-w-[200px] truncate">
                          {project.name || "Untitled Project"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {project._id.slice(-8)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            v{project.version || 1}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {project.owner_ref
                          ? project.owner_ref.slice(-8)
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {project.compiler || "xelatex"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IconUsers className="h-3 w-3" />
                        <span className="text-sm">
                          {(project.collaberator_refs?.length || 0) +
                            (project.readOnly_refs?.length || 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.lastUpdated
                        ? new Date(project.lastUpdated).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <IconSettings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewProjectDetails(project)}
                          >
                            <IconEye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProject(project);
                              setExportDialogOpen(true);
                            }}
                          >
                            <IconDownload className="mr-2 h-4 w-4" />
                            Export Project
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconUsers className="mr-2 h-4 w-4" />
                            View Collaborators
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{" "}
            {Math.min((currentPage + 1) * pageSize, projectsData?.total || 0)}{" "}
            of {projectsData?.total || 0} projects
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <IconChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Project</DialogTitle>
            <DialogDescription>
              Export "{selectedProject?.name || "Untitled Project"}" to a
              downloadable archive.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="outputPath" className="text-right">
                Output Path
              </Label>
              <Input
                id="outputPath"
                defaultValue={`/tmp/${selectedProject?.name || "project"}_${selectedProject?._id?.slice(-8)}.zip`}
                className="col-span-3"
                placeholder="/path/to/export.zip"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleExportProject((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const input = document.getElementById(
                  "outputPath",
                ) as HTMLInputElement;
                handleExportProject(input.value);
              }}
              disabled={exportProjectMutation.isPending}
            >
              {exportProjectMutation.isPending && (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              )}
              Export Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Details Drawer */}
      <Drawer
        open={projectDetailsDrawerOpen}
        onOpenChange={setProjectDetailsDrawerOpen}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Project Details</DrawerTitle>
            <DrawerDescription>
              {selectedProject?.name || "Untitled Project"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {selectedProject && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Project Name</div>
                      <div className="font-medium">
                        {selectedProject.name || "Untitled Project"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Project ID</div>
                      <div className="font-mono text-xs">
                        {selectedProject._id}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Owner</div>
                      <div className="font-mono text-xs">
                        {selectedProject.owner_ref || "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Compiler</div>
                      <div className="font-medium">
                        <Badge variant="secondary">
                          {selectedProject.compiler || "xelatex"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Version</div>
                      <div className="font-medium">
                        v{selectedProject.version || 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Spell Check Language
                      </div>
                      <div className="font-medium">
                        {selectedProject.spellCheckLanguage || "en"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Activity Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Last Updated</div>
                      <div className="font-medium">
                        {selectedProject.lastUpdated
                          ? new Date(
                              selectedProject.lastUpdated,
                            ).toLocaleString()
                          : "Never"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Root Document</div>
                      <div className="font-medium">
                        {selectedProject.rootDoc_id || "Not set"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collaboration Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Collaboration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Collaborators</div>
                      <div className="font-medium">
                        {selectedProject.collaberator_refs?.length || 0}{" "}
                        collaborators
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Read-only Users
                      </div>
                      <div className="font-medium">
                        {selectedProject.readOnly_refs?.length || 0} read-only
                        users
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Public Access</div>
                      <div className="font-medium">
                        <Badge
                          variant={
                            selectedProject.publicAccesLevel === "tokenBased"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {selectedProject.publicAccesLevel || "Token-based"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Tokens */}
                {selectedProject.tokens && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Access Tokens</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Read & Write Token
                        </div>
                        <div className="font-mono text-xs bg-muted p-2 rounded">
                          {selectedProject.tokens.readAndWrite ||
                            "Not available"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Read-only Token
                        </div>
                        <div className="font-mono text-xs bg-muted p-2 rounded">
                          {selectedProject.tokens.readOnly || "Not available"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Structure Preview */}
                {selectedProject.rootFolder &&
                  selectedProject.rootFolder.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">File Structure</h4>
                      <div className="text-xs text-muted-foreground">
                        Project contains {selectedProject.rootFolder.length}{" "}
                        root level items
                      </div>
                      <div className="bg-muted p-3 rounded text-xs">
                        <div className="flex items-center gap-2">
                          <IconFolder className="h-3 w-3" />
                          <span>
                            Root Folder ({selectedProject.rootFolder.length}{" "}
                            items)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Collaborator List */}
                {(selectedProject.collaberator_refs?.length > 0 ||
                  selectedProject.readOnly_refs?.length > 0) && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">
                      Collaborator Details
                    </h4>
                    <div className="space-y-3">
                      {selectedProject.collaberator_refs?.length > 0 && (
                        <div>
                          <div className="text-muted-foreground text-xs mb-2">
                            Read & Write Access
                          </div>
                          <div className="space-y-1">
                            {selectedProject.collaberator_refs.map(
                              (ref: string, index: number) => (
                                <div
                                  key={index}
                                  className="font-mono text-xs bg-green-50 p-2 rounded"
                                >
                                  {ref}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {selectedProject.readOnly_refs?.length > 0 && (
                        <div>
                          <div className="text-muted-foreground text-xs mb-2">
                            Read-only Access
                          </div>
                          <div className="space-y-1">
                            {selectedProject.readOnly_refs.map(
                              (ref: string, index: number) => (
                                <div
                                  key={index}
                                  className="font-mono text-xs bg-yellow-50 p-2 rounded"
                                >
                                  {ref}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
