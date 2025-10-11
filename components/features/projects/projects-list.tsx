"use client";

import {
  IconDownload,
  IconFileText,
  IconFolder,
  IconLoader,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { ProjectsDataTable } from "./projects-table/data-table";

export function ProjectsList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, _setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [projectDetailsDrawerOpen, setProjectDetailsDrawerOpen] =
    useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Queries
  const {
    data: projectsData,
    isLoading,
    refetch,
  } = trpc.project.list.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    searchName: debouncedSearchTerm || undefined,
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

  const handleExportFromTable = (project: any) => {
    setSelectedProject(project);
    setExportDialogOpen(true);
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
      <div className="flex items-center justify-end gap-4 px-4 lg:px-6">
        <div className="flex gap-2">
          <Button variant="outline">
            <IconDownload className="mr-2 h-4 w-4" />
            Bulk Export
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Card className="mx-4 lg:mx-6">
        <CardContent className="p-6">
          <ProjectsDataTable
            data={projectsData?.projects || []}
            loading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={projectsData?.total || 0}
            searchTerm={searchTerm}
            onPageChange={setCurrentPage}
            onSearchChange={setSearchTerm}
            onViewDetails={handleViewProjectDetails}
            onExport={handleExportFromTable}
          />
        </CardContent>
      </Card>

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
