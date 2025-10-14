"use client";

import { IconDownload, IconTool } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminUsersExportPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <IconDownload className="h-6 w-6" />
            User Export
          </h1>
          <p className="text-muted-foreground">
            Export user data and manage user records.
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
              This page will provide user data export capabilities including:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Export user list to CSV/Excel</li>
              <li>• User activity reports</li>
              <li>• Bulk user data export</li>
              <li>• Filtered export by registration date</li>
              <li>• GDPR-compliant data exports</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
