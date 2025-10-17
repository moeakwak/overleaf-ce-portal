"use client";

import { IconKey, IconLoader, IconUnlink } from "@tabler/icons-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LinkedAccountProfile = {
  email?: string | null;
  isAdmin?: boolean | null;
  signUpDate?: Date | string | null;
  lastActive?: Date | string | null;
  lastLoggedIn?: Date | string | null;
  loginCount?: number | null;
};

type LinkedAccount = {
  overleafUserId: string;
  overleafUserEmail?: string | null;
  profile?: LinkedAccountProfile | null;
};

export type LinkedAccountsCardProps = {
  linkedAccounts: LinkedAccount[];
  portalRole: string;
  editingAccountId: string | null;
  passwordDrafts: Record<string, string>;
  isUpdatePasswordPending: boolean;
  isUnlinkPending: boolean;
  onSetEditing: (accountId: string | null) => void;
  onChangePasswordDraft: (accountId: string, value: string) => void;
  onSubmitPasswordUpdate: (
    accountId: string,
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
  onRequestUnlink: (id: string, label: string) => void;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Never";
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  } catch {
    return "Unknown";
  }
}

export function LinkedAccountsCard(props: LinkedAccountsCardProps) {
  const {
    linkedAccounts,
    portalRole,
    editingAccountId,
    passwordDrafts,
    isUpdatePasswordPending,
    isUnlinkPending,
    onSetEditing,
    onChangePasswordDraft,
    onSubmitPasswordUpdate,
    onRequestUnlink,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Overleaf account</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {linkedAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not linked an Overleaf account yet.
          </p>
        ) : (
          linkedAccounts.map((account) => {
            const summary = account.profile;
            const passwordValue = passwordDrafts[account.overleafUserId] ?? "";
            const isEditing = editingAccountId === account.overleafUserId;
            const disableAccountActions =
              isUpdatePasswordPending || isUnlinkPending;

            return (
              <div
                key={account.overleafUserId}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">
                      {summary?.email ??
                        account.overleafUserEmail ??
                        "Unknown email"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {account.overleafUserId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {summary?.isAdmin ? "overleaf-admin" : "standard"}
                    </Badge>
                    <Badge variant="secondary">Portal role: {portalRole}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <span className="block text-xs uppercase tracking-wide">
                      Sign up date
                    </span>
                    <span className="text-foreground">
                      {formatDate(summary?.signUpDate)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide">
                      Last active
                    </span>
                    <span className="text-foreground">
                      {formatDate(summary?.lastActive ?? summary?.lastLoggedIn)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide">
                      Login count
                    </span>
                    <span className="text-foreground">
                      {summary?.loginCount ?? 0}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                    onSubmit={(event) =>
                      onSubmitPasswordUpdate(account.overleafUserId, event)
                    }
                  >
                    <div className="grid gap-2">
                      <Label htmlFor={`password-${account.overleafUserId}`}>
                        New Password
                      </Label>
                      <Input
                        id={`password-${account.overleafUserId}`}
                        type="password"
                        value={passwordValue}
                        onChange={(event) =>
                          onChangePasswordDraft(
                            account.overleafUserId,
                            event.target.value,
                          )
                        }
                        placeholder="Enter a new password"
                        disabled={disableAccountActions}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          onSetEditing(null);
                          onChangePasswordDraft(account.overleafUserId, "");
                        }}
                        disabled={disableAccountActions}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={disableAccountActions}>
                        {isUpdatePasswordPending ? (
                          <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconKey className="mr-2 h-4 w-4" />
                        )}
                        Save Password
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onSetEditing(account.overleafUserId)}
                      disabled={disableAccountActions}
                    >
                      <IconKey className="mr-2 h-4 w-4" />
                      Update Password
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Unlink Account"
                      aria-label="Unlink Account"
                      className="ml-auto"
                      onClick={() =>
                        onRequestUnlink(
                          account.overleafUserId,
                          summary?.email ??
                            account.overleafUserEmail ??
                            account.overleafUserId,
                        )
                      }
                      disabled={disableAccountActions}
                    >
                      {isUnlinkPending ? (
                        <IconLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconUnlink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
