"use client";

import { IconKey, IconLoader } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PortalAccessCardProps = {
  passwordLoginEnabled: boolean;
  portalPasswordExists: boolean;
  portalPasswordMutationPending: boolean;
  portalPasswordButtonLabel: string;
  onOpenPasswordDialog: () => void;
};

export function PortalAccessCard(props: PortalAccessCardProps) {
  const {
    passwordLoginEnabled,
    portalPasswordExists,
    portalPasswordMutationPending,
    portalPasswordButtonLabel,
    onOpenPasswordDialog,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {passwordLoginEnabled ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-medium">
                {portalPasswordExists
                  ? "Portal Password Enabled"
                  : "Portal Password Not Set"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {portalPasswordExists
                  ? "Update your portal password to secure your account. This action will sign out other sessions."
                  : "Set up a portal password to enable email and password sign-in alongside OIDC access."}
              </p>
            </div>
            <Button
              onClick={onOpenPasswordDialog}
              disabled={portalPasswordMutationPending}
            >
              {portalPasswordMutationPending ? (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconKey className="mr-2 h-4 w-4" />
              )}
              {portalPasswordButtonLabel}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Portal password login is disabled. Use your organization&apos;s
              single sign-on to access the portal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
