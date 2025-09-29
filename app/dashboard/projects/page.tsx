"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ProjectsList } from "@/components/projects-list";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ProjectsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4">
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
