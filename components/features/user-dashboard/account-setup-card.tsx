"use client";

import { IconLink, IconLoader, IconUserPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountSetupState = "linked" | "registered" | "unregistered" | "conflict";

export type AccountSetupCardProps = {
  visible: boolean;
  state: AccountSetupState;
  heading: string;
  message: string;
  isOverleafAvailable: boolean;
  createDisabled: boolean;
  createDisabledReason?: string;
  linkDisabled: boolean;
  linkDisabledTitle?: string;
  isCreatePending: boolean;
  isPrimaryLinkPending: boolean;
  isManualLinkPending: boolean;
  onCreate: () => void;
  onLinkPrimary: () => void;
  onOpenManualLink: () => void;
};

export function AccountSetupCard(props: AccountSetupCardProps) {
  const {
    visible,
    state,
    heading,
    message,
    isOverleafAvailable,
    createDisabled,
    createDisabledReason,
    linkDisabled,
    linkDisabledTitle,
    isCreatePending,
    isPrimaryLinkPending,
    isManualLinkPending,
    onCreate,
    onLinkPrimary,
    onOpenManualLink,
  } = props;

  if (!visible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{heading}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === "unregistered" ? (
            <Button
              onClick={onCreate}
              disabled={createDisabled}
              title={createDisabled ? createDisabledReason : undefined}
            >
              {isCreatePending ? (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconUserPlus className="mr-2 h-4 w-4" />
              )}
              Create And Link New Account
            </Button>
          ) : null}

          {state === "registered" ? (
            <Button
              onClick={onLinkPrimary}
              disabled={!isOverleafAvailable || isPrimaryLinkPending}
              title={
                !isOverleafAvailable
                  ? "Overleaf service is currently unavailable. Please try again later."
                  : undefined
              }
            >
              {isPrimaryLinkPending ? (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconLink className="mr-2 h-4 w-4" />
              )}
              Link With Portal Email
            </Button>
          ) : null}

          {state !== "linked" && state !== "conflict" ? (
            <Button
              variant="outline"
              onClick={onOpenManualLink}
              disabled={linkDisabled}
              title={linkDisabledTitle}
            >
              {isManualLinkPending ? (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconLink className="mr-2 h-4 w-4" />
              )}
              Link Different Overleaf Account
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
