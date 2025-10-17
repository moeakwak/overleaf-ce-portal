"use client";

import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconKey,
  IconLink,
  IconLoader,
  IconLogout,
  IconRefresh,
  IconUnlink,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OverleafStatusBanner } from "@/components/common/overleaf-status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function getRandomIndex(range: number) {
  if (range <= 0) return 0;
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % range;
  }
  return Math.floor(Math.random() * range);
}

function shuffleArray<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function generateSecurePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";

  const pools = [upper, lower, digits, symbols];
  const requiredChars = pools.map((pool) => pool[getRandomIndex(pool.length)]);

  const remainingLength = Math.max(length, pools.length) - requiredChars.length;
  const allCharacters = pools.join("");
  const additionalChars = Array.from(
    { length: remainingLength },
    () => allCharacters[getRandomIndex(allCharacters.length)],
  );

  return shuffleArray([...requiredChars, ...additionalChars]).join("");
}

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
      setIsLinkDialogOpen(false);
      await utils.self.overview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePasswordMutation = trpc.self.updateOverleafPassword.useMutation({
    onSuccess: async (_, variables) => {
      toast.success("Password Updated Successfully");
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

  const linkPrimaryAccountMutation =
    trpc.self.linkPrimaryOverleafAccount.useMutation({
      onSuccess: async () => {
        toast.success("Overleaf account linked successfully");
        await utils.self.overview.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const unlinkAccountMutation = trpc.self.unlinkOverleafAccount.useMutation({
    onSuccess: async () => {
      toast.success("Overleaf account unlinked successfully");
      setEditingAccountId(null);
      setPasswordDrafts({});
      await utils.self.overview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [isPortalPasswordDialogOpen, setIsPortalPasswordDialogOpen] =
    useState(false);
  const [portalPasswordForm, setPortalPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const handlePortalPasswordSuccess = async (message: string) => {
    toast.success(message);
    setPortalPasswordForm({ current: "", next: "", confirm: "" });
    setIsPortalPasswordDialogOpen(false);
    await utils.self.overview.invalidate();
  };

  const changePortalPasswordMutation =
    trpc.self.changePortalPassword.useMutation({
      onSuccess: async () => {
        await handlePortalPasswordSuccess(
          "Portal Password Updated Successfully",
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const setPortalPasswordMutation = trpc.self.setPortalPassword.useMutation({
    onSuccess: async () => {
      await handlePortalPasswordSuccess("Portal Password Set Successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCopyGeneratedPassword = async () => {
    if (!generatedPassword) {
      return;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API not available");
      }

      await navigator.clipboard.writeText(generatedPassword);
      toast.success("Password copied to clipboard");
    } catch (_error) {
      toast.error("Unable to copy password. Please copy it manually.");
    }
  };

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

    const { linkedAccounts, primaryEmailStatus, overleafInstanceAvailable } =
      data;

    // Primary logic: check database linkedAccounts first
    const hasLinkedAccount = linkedAccounts.length > 0;

    if (hasLinkedAccount) {
      // If database has link, always show as linked regardless of Overleaf availability
      return {
        tone: "success",
        title: "Overleaf account linked",
        description:
          "Your portal profile is connected to an Overleaf CE account.",
      } satisfies StatusDescriptor;
    }

    // No linked account in database
    // If Overleaf is unavailable, show specific message
    if (!overleafInstanceAvailable) {
      return {
        tone: "info",
        title: "Overleaf service unavailable",
        description:
          "Cannot verify Overleaf account status. The service is currently unavailable. If you have already linked an account, it will appear here once the service is restored.",
      } satisfies StatusDescriptor;
    }

    // Overleaf is available and no link in database
    // Now check real-time Overleaf status
    if (primaryEmailStatus.linkedByOther) {
      return {
        tone: "danger",
        title: "Account linked to another user",
        description: `The Overleaf account for ${primaryEmailStatus.email} is currently linked to ${primaryEmailStatus.linkedByOther.name} (${primaryEmailStatus.linkedByOther.email}). Please contact an administrator if this is unexpected.`,
      } satisfies StatusDescriptor;
    }

    if (primaryEmailStatus.overleafUser) {
      return {
        tone: "info",
        title: "Overleaf account available to link",
        description: `An Overleaf CE account for ${primaryEmailStatus.email} exists but is not linked yet. Use the Account Setup actions to connect it.`,
      } satisfies StatusDescriptor;
    }

    return {
      tone: "warning",
      title: "No Overleaf account found",
      description: `We could not find an Overleaf CE account for ${primaryEmailStatus.email}. You can create a new account now.`,
    } satisfies StatusDescriptor;
  }, [data]);

  const handleCreateAccount = async () => {
    if (createAccountMutation.isPending) {
      return;
    }

    const password = generateSecurePassword();

    try {
      await createAccountMutation.mutateAsync({
        password,
      });
      setGeneratedPassword(password);
      setIsPasswordDialogOpen(true);
    } catch (_error) {
      setGeneratedPassword(null);
    }
  };

  const handleLinkAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((data?.linkedAccounts.length ?? 0) > 0) {
      toast.error("Only one Overleaf account can be linked");
      return;
    }
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

  const handleUnlinkAccount = async (overleafUserId: string) => {
    if (unlinkAccountMutation.isPending) {
      return;
    }

    try {
      await unlinkAccountMutation.mutateAsync({ overleafUserId });
      setUnlinkTarget(null);
      setIsUnlinkDialogOpen(false);
    } catch (_error) {
      // Errors handled in onError.
    }
  };

  const handlePortalPasswordChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (portalPasswordMutationPending) {
      return;
    }

    if (portalPasswordExists && !portalPasswordForm.current) {
      toast.error("Please enter your current password");
      return;
    }

    if (!portalPasswordForm.next || portalPasswordForm.next.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (portalPasswordForm.next !== portalPasswordForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      if (portalPasswordExists) {
        await changePortalPasswordMutation.mutateAsync({
          currentPassword: portalPasswordForm.current,
          newPassword: portalPasswordForm.next,
        });
      } else {
        await setPortalPasswordMutation.mutateAsync({
          newPassword: portalPasswordForm.next,
        });
      }
    } catch (_error) {
      // Errors handled in mutation onError.
    }
  };

  const linkedAccounts = data?.linkedAccounts ?? [];
  const hasLinkedAccount = linkedAccounts.length > 0;
  const primaryEmail = data?.primaryEmailStatus.email ?? "";
  const primaryOverleafUser = data?.primaryEmailStatus.overleafUser ?? null;
  const primaryLinkedByOther = Boolean(data?.primaryEmailStatus.linkedByOther);
  const linkedByOtherInfo = data?.primaryEmailStatus.linkedByOther ?? null;
  const isOverleafAvailable = data?.overleafInstanceAvailable ?? true;
  const linkedAccountLabels = linkedAccounts
    .map((account) => account.overleafUserEmail ?? account.overleafUserId)
    .filter((value): value is string => Boolean(value));
  const passwordLoginEnabled = data?.auth.passwordLoginEnabled ?? false;
  const oidcLoginEnabled = data?.auth.oidcLoginEnabled ?? false;
  const oidcProviderName = data?.auth.oidcProviderName ?? "OIDC";
  const oidcConnections = data?.auth.oidcConnections ?? [];
  const portalPasswordExists = Boolean(data?.auth.hasPassword);
  const portalPasswordMutationPending =
    changePortalPasswordMutation.isPending ||
    setPortalPasswordMutation.isPending;
  const portalPasswordButtonLabel = portalPasswordExists
    ? "Change Portal Password"
    : "Set Up Portal Password";
  const portalPasswordDialogTitle = portalPasswordExists
    ? "Update Portal Password"
    : "Set Up Portal Password";
  const portalPasswordDialogDescription = portalPasswordExists
    ? "Enter your current password and choose a new one for your portal account."
    : "Create a new password for your portal account to enable email and password sign-in.";

  type AccountSetupState =
    | "linked"
    | "registered"
    | "unregistered"
    | "conflict";
  const accountSetupState: AccountSetupState = hasLinkedAccount
    ? "linked"
    : primaryLinkedByOther
      ? "conflict"
      : primaryOverleafUser
        ? "registered"
        : "unregistered";

  const accountSetupHeadingMap: Record<AccountSetupState, string> = {
    linked: "Overleaf account connected",
    registered: "Connect your Overleaf access",
    unregistered: "Set up your Overleaf access",
    conflict: "Overleaf account in use by another user",
  };

  const accountSetupMessageMap: Record<AccountSetupState, string> = {
    linked:
      linkedAccountLabels.length > 0
        ? `Your portal profile is linked to ${linkedAccountLabels.join(", ")}.`
        : "Your portal profile is linked to an Overleaf account.",
    registered: `An Overleaf CE account already exists for ${primaryEmail}. Link it below to manage it from the portal.`,
    unregistered: `We could not find an Overleaf CE account for ${primaryEmail}. Create a new account or link an existing one using a different email.`,
    conflict: linkedByOtherInfo
      ? `The Overleaf CE account for ${primaryEmail} is currently linked to ${linkedByOtherInfo.name} (${linkedByOtherInfo.email}). Please contact an administrator to resolve this before linking.`
      : `The Overleaf CE account for ${primaryEmail} is linked to another user. Please contact an administrator for assistance.`,
  };

  const createButtonDisabled =
    !isOverleafAvailable ||
    accountSetupState !== "unregistered" ||
    createAccountMutation.isPending;
  let createButtonDisabledReason: string | undefined;
  if (!isOverleafAvailable) {
    createButtonDisabledReason =
      "Overleaf service is currently unavailable. Please try again later.";
  } else if (accountSetupState === "registered") {
    createButtonDisabledReason = `An Overleaf account already exists for ${primaryEmail}.`;
  } else if (accountSetupState === "conflict") {
    createButtonDisabledReason = linkedByOtherInfo
      ? `This Overleaf account is linked to ${linkedByOtherInfo.name}.`
      : "This Overleaf account is linked to another user.";
  } else if (accountSetupState === "linked") {
    createButtonDisabledReason = "You have already linked an Overleaf account.";
  }

  const linkButtonDisabled =
    !isOverleafAvailable ||
    hasLinkedAccount ||
    accountSetupState === "conflict" ||
    linkAccountMutation.isPending;
  let linkButtonDisabledReason: string | undefined;
  if (!isOverleafAvailable) {
    linkButtonDisabledReason =
      "Overleaf service is currently unavailable. Please try again later.";
  } else if (hasLinkedAccount || accountSetupState === "linked") {
    linkButtonDisabledReason = "You have already linked an Overleaf account.";
  } else if (accountSetupState === "conflict") {
    linkButtonDisabledReason = linkedByOtherInfo
      ? `This account belongs to ${linkedByOtherInfo.name}.`
      : "This account belongs to another user.";
  }

  const shouldShowSetupCard = !hasLinkedAccount;
  const manualLinkDisabled =
    !isOverleafAvailable ||
    linkButtonDisabled ||
    linkPrimaryAccountMutation.isPending;
  const manualLinkDisabledTitle = manualLinkDisabled
    ? !isOverleafAvailable
      ? "Overleaf service is currently unavailable. Please try again later."
      : linkButtonDisabledReason ||
        (linkPrimaryAccountMutation.isPending
          ? "Linking in progress"
          : undefined)
    : undefined;

  const handleLinkPrimaryAccount = async () => {
    if (linkPrimaryAccountMutation.isPending) {
      return;
    }

    try {
      await linkPrimaryAccountMutation.mutateAsync();
    } catch (_error) {
      // Errors handled via onError.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {!isOverleafAvailable && <OverleafStatusBanner isAdmin={false} />}
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Welcome back, {session.user.name ?? session.user.email}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage your Overleaf CE account connection and keep your credentials
            up to date.
          </p>
          <span className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <Button
            variant="ghost"
            size="icon"
            title="Log Out"
            aria-label="Log Out"
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
        <Tabs defaultValue="overleaf-service" className="w-full">
          <TabsList className="mt-2 w-fit">
            <TabsTrigger value="overleaf-service">Overleaf Service</TabsTrigger>
            <TabsTrigger value="portal-settings">Portal Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overleaf-service" className="mt-6 space-y-6">
            {shouldShowSetupCard ? (
              <Card>
                <CardHeader>
                  <CardTitle>Account Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-medium">
                      {accountSetupHeadingMap[accountSetupState]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {accountSetupMessageMap[accountSetupState]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accountSetupState === "unregistered" ? (
                      <Button
                        onClick={handleCreateAccount}
                        disabled={createButtonDisabled}
                        title={
                          createButtonDisabled
                            ? createButtonDisabledReason
                            : undefined
                        }
                      >
                        {createAccountMutation.isPending ? (
                          <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconUserPlus className="mr-2 h-4 w-4" />
                        )}
                        Create And Link New Account
                      </Button>
                    ) : null}

                    {accountSetupState === "registered" ? (
                      <Button
                        onClick={handleLinkPrimaryAccount}
                        disabled={
                          !isOverleafAvailable ||
                          linkPrimaryAccountMutation.isPending
                        }
                        title={
                          !isOverleafAvailable
                            ? "Overleaf service is currently unavailable. Please try again later."
                            : undefined
                        }
                      >
                        {linkPrimaryAccountMutation.isPending ? (
                          <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconLink className="mr-2 h-4 w-4" />
                        )}
                        Link With Portal Email
                      </Button>
                    ) : null}

                    {accountSetupState !== "linked" &&
                    accountSetupState !== "conflict" ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsLinkDialogOpen(true)}
                        disabled={manualLinkDisabled}
                        title={manualLinkDisabledTitle}
                      >
                        {linkAccountMutation.isPending ? (
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
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {primaryStatus ? (
                  <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
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
              </CardContent>
            </Card>

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
                    const passwordValue =
                      passwordDrafts[account.overleafUserId] ?? "";
                    const isEditing =
                      editingAccountId === account.overleafUserId;
                    const disableAccountActions =
                      updatePasswordMutation.isPending ||
                      unlinkAccountMutation.isPending;

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
                            <Badge variant="secondary">
                              Portal role: {data.portalUser.role}
                            </Badge>
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
                                New Password
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
                                disabled={disableAccountActions}
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
                                disabled={disableAccountActions}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={disableAccountActions}
                              >
                                {updatePasswordMutation.isPending ? (
                                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <IconKey className="mr-2 h-4 w-4" />
                                )}
                                Save Password
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setEditingAccountId(account.overleafUserId)
                              }
                              disabled={disableAccountActions}
                            >
                              <IconKey className="mr-2 h-4 w-4" />
                              Update Password
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                setUnlinkTarget({
                                  id: account.overleafUserId,
                                  label:
                                    summary?.email ??
                                    account.overleafUserEmail ??
                                    account.overleafUserId,
                                });
                                setIsUnlinkDialogOpen(true);
                              }}
                              disabled={disableAccountActions}
                            >
                              {unlinkAccountMutation.isPending ? (
                                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <IconUnlink className="mr-2 h-4 w-4" />
                              )}
                              Unlink Account
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

          <TabsContent value="portal-settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portal Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Email address</span>
                  <span className="font-medium">{data.portalUser.email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Display name</span>
                  <span className="font-medium">{data.portalUser.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Portal user ID</span>
                  <span className="font-mono text-xs">
                    {data.portalUser.id}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Created at</span>
                  <span className="font-medium">
                    {formatDate(data.portalUser.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="font-medium">
                    {formatDate(data.portalUser.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

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
                      onClick={() => {
                        if (!portalPasswordMutationPending) {
                          setIsPortalPasswordDialogOpen(true);
                        }
                      }}
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
                      Portal password login is disabled. Use your
                      organization&apos;s single sign-on to access the portal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {oidcLoginEnabled ? (
              <Card>
                <CardHeader>
                  <CardTitle>{oidcProviderName} Connection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your portal account can also authenticate via{" "}
                    {oidcProviderName}. Linked identities are listed below.
                  </p>
                  {oidcConnections.length > 0 ? (
                    <div className="space-y-3">
                      {oidcConnections.map((connection) => (
                        <div
                          key={`${connection.providerId}-${connection.accountId}`}
                          className="rounded-lg border p-4 text-sm"
                        >
                          <div className="space-y-1">
                            <span className="font-medium">Account ID</span>
                            <p className="font-mono text-xs text-muted-foreground">
                              {connection.accountId}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-col gap-1">
                            <span className="text-muted-foreground">
                              Linked on
                            </span>
                            <span>{formatDate(connection.linkedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No OIDC connection has been established yet. It will
                      appear here after your first sign-in via{" "}
                      {oidcProviderName}.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">
          Unable to load dashboard data right now.
        </p>
      )}

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          if (!linkAccountMutation.isPending) {
            setIsLinkDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link an existing Overleaf account</DialogTitle>
            <DialogDescription>
              Enter the Overleaf credentials you want to connect to this portal
              user.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleLinkAccount}>
            <div className="grid gap-2">
              <Label htmlFor="link-email">Overleaf email</Label>
              <Input
                id="link-email"
                type="email"
                value={linkEmail}
                onChange={(event) => setLinkEmail(event.target.value)}
                placeholder="name@example.com"
                disabled={linkAccountMutation.isPending}
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
                disabled={linkAccountMutation.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
                disabled={linkAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={linkAccountMutation.isPending}>
                {linkAccountMutation.isPending ? (
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconLink className="mr-2 h-4 w-4" />
                )}
                Link Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPortalPasswordDialogOpen}
        onOpenChange={(open) => {
          if (!portalPasswordMutationPending) {
            setIsPortalPasswordDialogOpen(open);
            if (!open) {
              setPortalPasswordForm({ current: "", next: "", confirm: "" });
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{portalPasswordDialogTitle}</DialogTitle>
            <DialogDescription>
              {portalPasswordDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handlePortalPasswordChange}>
            {portalPasswordExists ? (
              <div className="grid gap-2">
                <Label htmlFor="portal-current-password">
                  Current Password
                </Label>
                <Input
                  id="portal-current-password"
                  type="password"
                  value={portalPasswordForm.current}
                  onChange={(event) =>
                    setPortalPasswordForm((prev) => ({
                      ...prev,
                      current: event.target.value,
                    }))
                  }
                  placeholder="Enter Current Password"
                  disabled={portalPasswordMutationPending}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="portal-new-password">New Password</Label>
              <Input
                id="portal-new-password"
                type="password"
                value={portalPasswordForm.next}
                onChange={(event) =>
                  setPortalPasswordForm((prev) => ({
                    ...prev,
                    next: event.target.value,
                  }))
                }
                placeholder="Enter New Password"
                disabled={portalPasswordMutationPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portal-confirm-password">
                Confirm New Password
              </Label>
              <Input
                id="portal-confirm-password"
                type="password"
                value={portalPasswordForm.confirm}
                onChange={(event) =>
                  setPortalPasswordForm((prev) => ({
                    ...prev,
                    confirm: event.target.value,
                  }))
                }
                placeholder="Confirm New Password"
                disabled={portalPasswordMutationPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!portalPasswordMutationPending) {
                    setIsPortalPasswordDialogOpen(false);
                    setPortalPasswordForm({
                      current: "",
                      next: "",
                      confirm: "",
                    });
                  }
                }}
                disabled={portalPasswordMutationPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={portalPasswordMutationPending}>
                {portalPasswordMutationPending ? (
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconKey className="mr-2 h-4 w-4" />
                )}
                Save Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPasswordDialogOpen(false);
            setGeneratedPassword(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your new Overleaf password</DialogTitle>
            <DialogDescription>
              This password is shown only once. Store it securely before closing
              this window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/50 px-4 py-3">
              <code className="text-base font-semibold">
                {generatedPassword}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy and save this password now. You can change it later from the
              linked account section if needed.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyGeneratedPassword}
              disabled={!generatedPassword}
            >
              <IconCopy className="mr-2 h-4 w-4" />
              Copy Password
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setGeneratedPassword(null);
              }}
            >
              I Have Saved It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUnlinkDialogOpen}
        onOpenChange={(open) => {
          if (!unlinkAccountMutation.isPending) {
            setIsUnlinkDialogOpen(open);
            if (!open) {
              setUnlinkTarget(null);
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Overleaf account?</DialogTitle>
            <DialogDescription>
              {unlinkTarget
                ? `This will remove the connection to ${unlinkTarget.label}. You can link it again later if needed.`
                : "This will remove the Overleaf account connection."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!unlinkAccountMutation.isPending) {
                  setIsUnlinkDialogOpen(false);
                  setUnlinkTarget(null);
                }
              }}
              disabled={unlinkAccountMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (unlinkTarget) {
                  void handleUnlinkAccount(unlinkTarget.id);
                }
              }}
              disabled={
                unlinkAccountMutation.isPending || unlinkTarget === null
              }
            >
              {unlinkAccountMutation.isPending ? (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconUnlink className="mr-2 h-4 w-4" />
              )}
              Unlink Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
