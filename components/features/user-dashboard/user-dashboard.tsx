"use client";

import {
  IconAlertTriangle,
  IconCheck,
  IconKey,
  IconLink,
  IconLoader,
  IconLogout,
  IconRefresh,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Session } from "@/lib/auth";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type UserDashboardProps = {
  session: Session;
};

type StatusDescriptor = {
  tone: "success" | "info" | "warning" | "danger";
  title: string;
  description: string;
};

const toneStyles: Record<StatusDescriptor["tone"], string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Never";
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  } catch (_error) {
    return "Unknown";
  }
}

export function UserDashboard({ session }: UserDashboardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, isFetching, refetch } =
    trpc.self.overview.useQuery();

  const createAccountMutation = trpc.self.createOverleafAccount.useMutation({
    onSuccess: async () => {
      toast.success("Overleaf account created and linked successfully");
      setCreatePassword("");
      await utils.self.overview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const linkAccountMutation = trpc.self.linkOverleafAccount.useMutation({
    onSuccess: async (_, variables) => {
      toast.success("Overleaf account linked successfully");
      setLinkPassword("");
      if (variables.email === (data?.primaryEmailStatus.email ?? "")) {
        setLinkEmail(variables.email);
      }
      await utils.self.overview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePasswordMutation = trpc.self.updateOverleafPassword.useMutation({
    onSuccess: async (_, variables) => {
      toast.success("Password updated successfully");
      setPasswordDrafts((prev) => ({
        ...prev,
        [variables.overleafUserId]: "",
      }));
      setEditingAccountId(null);
      await utils.self.overview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [createPassword, setCreatePassword] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (_error) {
      toast.error("Failed to sign out. Please try again later.");
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const defaultEmail = data?.primaryEmailStatus.email ?? "";
    setLinkEmail((prev) => {
      if (!prev || prev === defaultEmail) {
        return defaultEmail;
      }
      return prev;
    });
  }, [data?.primaryEmailStatus.email]);

  const primaryStatus: StatusDescriptor | null = useMemo(() => {
    if (!data) {
      return null;
    }

    const { primaryEmailStatus } = data;

    if (!primaryEmailStatus.overleafUser) {
      return {
        tone: "warning",
        title: "No Overleaf account found",
        description: `We could not find an Overleaf CE account for ${primaryEmailStatus.email}. You can create a new account now.`,
      } satisfies StatusDescriptor;
    }

    if (primaryEmailStatus.linkedByOther) {
      return {
        tone: "danger",
        title: "Account linked to another user",
        description: `The Overleaf account for ${primaryEmailStatus.email} is currently linked to ${primaryEmailStatus.linkedByOther.name} (${primaryEmailStatus.linkedByOther.email}). Please contact an administrator if this is unexpected.`,
      } satisfies StatusDescriptor;
    }

    if (primaryEmailStatus.linkedToCurrentUser) {
      return {
        tone: "success",
        title: "Primary Overleaf account linked",
        description:
          "Your portal profile is connected to the matching Overleaf CE account.",
      } satisfies StatusDescriptor;
    }

    return {
      tone: "info",
      title: "Overleaf account available to link",
      description: `An Overleaf CE account for ${primaryEmailStatus.email} exists but is not linked yet. Use the form below to connect it.`,
    } satisfies StatusDescriptor;
  }, [data]);

  const handleCreateAccount = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!createPassword || createPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        password: createPassword,
      });
    } catch (_error) {
      // Errors are handled in onError callback.
    }
  };

  const handleLinkAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!linkEmail) {
      toast.error("Please enter an email address");
      return;
    }
    if (!linkPassword || linkPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await linkAccountMutation.mutateAsync({
        email: linkEmail.trim().toLowerCase(),
        password: linkPassword,
      });
    } catch (_error) {
      // Errors are handled in onError callback.
    }
  };

  const handlePasswordUpdate = async (
    accountId: string,
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const nextPassword = passwordDrafts[accountId] ?? "";
    if (!nextPassword || nextPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        overleafUserId: accountId,
        password: nextPassword,
      });
    } catch (_error) {
      // Errors are handled in onError callback.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Welcome back, {session.user.name ?? session.user.email}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage your Overleaf CE accounts, create new connections, and keep
            your credentials up to date.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <Button
            variant="ghost"
            size="icon"
            title="Log out"
            aria-label="Log out"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <IconLoader className="h-4 w-4 animate-spin" />
            ) : (
              <IconLogout className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching || isLoading}
          >
            {isFetching ? (
              <IconLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          {session.user.role === "super-admin" ? (
            <Button asChild>
              <Link href="/admin/dashboard">Open Admin Portal</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mt-4 w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="link">Account Setup</TabsTrigger>
            <TabsTrigger value="accounts">Linked Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {primaryStatus ? (
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        toneStyles[primaryStatus.tone],
                      )}
                    >
                      {primaryStatus.tone === "success" ? (
                        <IconCheck className="h-5 w-5" />
                      ) : (
                        <IconAlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h2 className="text-lg font-medium">
                        {primaryStatus.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {primaryStatus.description}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Portal email</span>
                    <span className="font-medium">{data.portalUser.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant="outline">{data.portalUser.role}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">
                      Linked Overleaf accounts
                    </span>
                    <span className="font-medium">
                      {data.linkedAccounts.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Primary email</span>
                    <span className="font-medium">
                      {data.primaryEmailStatus.email}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link" className="mt-6 space-y-6">
            {!data.primaryEmailStatus.overleafUser ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create a new Overleaf account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={handleCreateAccount}>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="create-email">Account email</Label>
                        <Badge variant="secondary">
                          {data.portalUser.email}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A new Overleaf CE account will be provisioned with this
                        email address.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="create-password">Set password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={createPassword}
                        onChange={(event) =>
                          setCreatePassword(event.target.value)
                        }
                        placeholder="Enter a secure password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="justify-start"
                      disabled={createAccountMutation.isPending}
                    >
                      {createAccountMutation.isPending ? (
                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <IconUserPlus className="mr-2 h-4 w-4" />
                      )}
                      Create and link account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Link an existing Overleaf account</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleLinkAccount}>
                  <div className="grid gap-2">
                    <Label htmlFor="link-email">Overleaf email</Label>
                    <Input
                      id="link-email"
                      type="email"
                      value={linkEmail}
                      onChange={(event) => setLinkEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="link-password">Password</Label>
                    <Input
                      id="link-password"
                      type="password"
                      value={linkPassword}
                      onChange={(event) => setLinkPassword(event.target.value)}
                      placeholder="Enter account password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="justify-start"
                    disabled={linkAccountMutation.isPending}
                  >
                    {linkAccountMutation.isPending ? (
                      <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <IconLink className="mr-2 h-4 w-4" />
                    )}
                    Link account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Linked Overleaf accounts</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {data.linkedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have not linked any Overleaf accounts yet.
                  </p>
                ) : (
                  data.linkedAccounts.map((account) => {
                    const summary = account.profile;
                    const passwordValue =
                      passwordDrafts[account.overleafUserId] ?? "";
                    const isEditing =
                      editingAccountId === account.overleafUserId;

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
                          <Badge variant="outline">
                            {summary?.isAdmin ? "overleaf-admin" : "standard"}
                          </Badge>
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
                              {formatDate(
                                summary?.lastActive ?? summary?.lastLoggedIn,
                              )}
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
                              handlePasswordUpdate(
                                account.overleafUserId,
                                event,
                              )
                            }
                          >
                            <div className="grid gap-2">
                              <Label
                                htmlFor={`password-${account.overleafUserId}`}
                              >
                                New password
                              </Label>
                              <Input
                                id={`password-${account.overleafUserId}`}
                                type="password"
                                value={passwordValue}
                                onChange={(event) =>
                                  setPasswordDrafts((prev) => ({
                                    ...prev,
                                    [account.overleafUserId]:
                                      event.target.value,
                                  }))
                                }
                                placeholder="Enter a new password"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAccountId(null);
                                  setPasswordDrafts((prev) => ({
                                    ...prev,
                                    [account.overleafUserId]: "",
                                  }));
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={updatePasswordMutation.isPending}
                              >
                                {updatePasswordMutation.isPending ? (
                                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <IconKey className="mr-2 h-4 w-4" />
                                )}
                                Save password
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setEditingAccountId(account.overleafUserId)
                              }
                            >
                              <IconKey className="mr-2 h-4 w-4" />
                              Update password
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">
          Unable to load dashboard data right now.
        </p>
      )}
    </div>
  );
}
