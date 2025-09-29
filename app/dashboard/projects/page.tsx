"use client";

import { ProjectsList } from "@/components/features/projects/projects-list";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Project Management</h1>
          <p className="text-muted-foreground">
            View and manage Overleaf projects, export data, and monitor
            project activity.
          </p>
        </div>
      </div>
      <ProjectsList />
    </div>
  );
}
