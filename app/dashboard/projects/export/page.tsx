"use client";

import { IconDownload, IconTool } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectsExportPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <IconDownload className="h-6 w-6" />
            Project Export
          </h1>
          <p className="text-muted-foreground">
            Export project data and backup projects.
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
              Project export functionality is coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will provide project data export capabilities including:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Individual project export</li>
              <li>• Bulk project backup</li>
              <li>• Project archives in ZIP format</li>
              <li>• Filtered export by date range</li>
              <li>• Export progress tracking</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
