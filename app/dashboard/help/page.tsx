"use client";

import {
  IconBook,
  IconBug,
  IconExternalLink,
  IconHelp,
  IconMail,
  IconMessageCircle,
} from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function HelpPage() {
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
                    <IconHelp className="h-6 w-6" />
                    Help & Support
                  </h1>
                  <p className="text-muted-foreground">
                    Find help and documentation for Overleaf CE Portal.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2">
                {/* Documentation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconBook className="h-5 w-5" />
                      Documentation
                    </CardTitle>
                    <CardDescription>
                      Learn how to use and configure the portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Quick Start</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Setting up your Overleaf CE Portal</li>
                        <li>• Configuring Docker and databases</li>
                        <li>• Managing users and permissions</li>
                      </ul>
                    </div>
                    <Button variant="outline" className="w-full">
                      <IconExternalLink className="mr-2 h-4 w-4" />
                      View Documentation
                    </Button>
                  </CardContent>
                </Card>

                {/* Contact Support */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconMail className="h-5 w-5" />
                      Contact Support
                    </CardTitle>
                    <CardDescription>
                      Get help from our support team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Support Options
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Email support for technical issues</li>
                        <li>• Community forums and discussions</li>
                        <li>• Bug reports and feature requests</li>
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <IconMail className="mr-2 h-4 w-4" />
                        Email
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <IconMessageCircle className="mr-2 h-4 w-4" />
                        Forum
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Common Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle>Common Issues</CardTitle>
                    <CardDescription>
                      Solutions to frequently encountered problems
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium">
                          Docker connection issues
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Ensure Docker socket is accessible and container is
                          running.
                        </p>
                      </details>
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium">
                          Database connection errors
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Check MongoDB and Redis connection settings in
                          environment variables.
                        </p>
                      </details>
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium">
                          User creation fails
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Verify that the Overleaf toolkit scripts are
                          accessible and executable.
                        </p>
                      </details>
                    </div>
                  </CardContent>
                </Card>

                {/* Report Bug */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconBug className="h-5 w-5" />
                      Report a Bug
                    </CardTitle>
                    <CardDescription>
                      Help us improve by reporting issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Found a bug or have a feature request? Let us know!
                      </p>
                    </div>
                    <Button className="w-full">
                      <IconBug className="mr-2 h-4 w-4" />
                      Submit Bug Report
                    </Button>
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
