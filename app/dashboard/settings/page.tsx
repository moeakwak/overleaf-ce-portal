"use client";

import { IconSettings, IconTool } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <IconSettings className="h-6 w-6" />
                    Settings
                  </h1>
                  <p className="text-muted-foreground">
                    Configure system settings and preferences.
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
                      This page is currently under development.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Settings functionality will be available in a future
                      version. This page will allow you to configure:
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li>• System configuration parameters</li>
                      <li>• User authentication settings</li>
                      <li>• Email notification preferences</li>
                      <li>• Data retention policies</li>
                      <li>• Integration settings</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
    </div>
  );
}
