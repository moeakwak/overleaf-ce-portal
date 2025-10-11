"use client";

import {
  IconBook,
  IconBug,
  IconExternalLink,
  IconHelp,
  IconMail,
  IconMessageCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <IconHelp className="h-6 w-6" />
            Help & Support
          </h1>
          <p className="text-muted-foreground">
            Get help, find documentation, and contact support.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBook className="h-5 w-5" />
              Documentation
            </CardTitle>
            <CardDescription>
              Learn how to use the Overleaf CE Portal
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              User Guide
            </Button>
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              API Documentation
            </Button>
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              Admin Manual
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconMessageCircle className="h-5 w-5" />
              Community Support
            </CardTitle>
            <CardDescription>
              Connect with the community and get help
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              Discussion Forum
            </Button>
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              Discord Server
            </Button>
            <Button variant="outline" className="justify-start">
              <IconExternalLink className="mr-2 h-4 w-4" />
              GitHub Issues
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBug className="h-5 w-5" />
              Report an Issue
            </CardTitle>
            <CardDescription>Found a bug? Let us know!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you've encountered a bug or issue, please report it through our
              GitHub repository or contact support.
            </p>
            <Button variant="outline" className="w-full">
              <IconBug className="mr-2 h-4 w-4" />
              Report Bug
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconMail className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>Need direct assistance?</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For urgent issues or enterprise support, contact our support team
              directly.
            </p>
            <Button variant="outline" className="w-full">
              <IconMail className="mr-2 h-4 w-4" />
              Email Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
