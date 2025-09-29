"use client";

import { IconDownload, IconTool } from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function UsersExportPage() {
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
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <IconDownload className="h-6 w-6" />
                    User Export
                  </h1>
                  <p className="text-muted-foreground">
                    Export user data and generate reports.
                  </p>
                </div>
              </div>

              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconTool className="h-5 w-5" />
                      Under Construction
                    </CardTitle>
                    <CardDescription>
                      User export functionality is coming soon.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      This page will provide user data export capabilities
                      including:
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li>• CSV export of user lists</li>
                      <li>• User activity reports</li>
                      <li>• Bulk user data export</li>
                      <li>• Filtered export options</li>
                      <li>• Scheduled export jobs</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
