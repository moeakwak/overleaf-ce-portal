"use client";

import {
  IconCertificate,
  IconLink,
  IconLoader,
  IconRefresh,
  IconUser,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type RouterOutputs, trpc } from "@/lib/trpc/client";
import { PortalUsersDataTable } from "./portal-users-table/data-table";

type PortalUserListResponse = RouterOutputs["portalUser"]["list"];
export type PortalUserRow = PortalUserListResponse["users"][number];

type PortalUserLinkState = {
  overleafUserId: string;
  overleafUserEmail: string | null;
};

const PAGE_SIZE = 25;

export function PortalUsersList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: portalUsersData,
    isLoading: portalUsersLoading,
    refetch: refetchPortalUsers,
  } = trpc.portalUser.list.useQuery({
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const { data: portalUserStats, isLoading: portalUserStatsLoading } =
    trpc.portalUser.getStats.useQuery();

  const totalPages = useMemo(() => {
    if (!portalUsersData?.total) return 1;
    return Math.max(1, Math.ceil(portalUsersData.total / PAGE_SIZE));
  }, [portalUsersData]);

  // Editing state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedPortalUserId, setSelectedPortalUserId] = useState<
    string | null
  >(null);
  const [formState, setFormState] = useState<{
    name: string;
    email: string;
    role: "user" | "super-admin";
  }>({
    name: "",
    email: "",
    role: "user",
  });
  const [linkedOverleafUsers, setLinkedOverleafUsers] = useState<
    PortalUserLinkState[]
  >([]);

  const [overleafSearchTerm, setOverleafSearchTerm] = useState("");
  const [debouncedOverleafSearchTerm, setDebouncedOverleafSearchTerm] =
    useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOverleafSearchTerm(overleafSearchTerm.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [overleafSearchTerm]);

  const { data: overleafSearchResults, isFetching: overleafSearchLoading } =
    trpc.overleafUser.search.useQuery(
      {
        emailPattern: debouncedOverleafSearchTerm || "@",
        limit: 5,
      },
      {
        enabled: editDrawerOpen && debouncedOverleafSearchTerm.length >= 2,
      },
    );

  const {
    data: selectedPortalUser,
    isLoading: selectedPortalUserLoading,
    error: selectedPortalUserError,
  } = trpc.portalUser.getById.useQuery(selectedPortalUserId ?? "", {
    enabled: Boolean(editDrawerOpen && selectedPortalUserId),
  });

  useEffect(() => {
    if (selectedPortalUserError) {
      toast.error(selectedPortalUserError.message);
    }
  }, [selectedPortalUserError]);

  useEffect(() => {
    if (selectedPortalUser) {
      setFormState({
        name: selectedPortalUser.name,
        email: selectedPortalUser.email,
        role: selectedPortalUser.role as "user" | "super-admin",
      });
      setLinkedOverleafUsers(
        selectedPortalUser.overleafLinks.map(
          (link): PortalUserLinkState => ({
            overleafUserId: link.overleafUserId,
            overleafUserEmail: link.overleafUserEmail ?? null,
          }),
        ),
      );
    }
  }, [selectedPortalUser]);

  useEffect(() => {
    if (!editDrawerOpen) {
      setSelectedPortalUserId(null);
      setFormState({
        name: "",
        email: "",
        role: "user",
      });
      setLinkedOverleafUsers([]);
      setOverleafSearchTerm("");
      setDebouncedOverleafSearchTerm("");
    }
  }, [editDrawerOpen]);

  const updatePortalUserMutation = trpc.portalUser.update.useMutation({
    onSuccess: () => {
      toast.success("Portal user updated successfully");
      setEditDrawerOpen(false);
      refetchPortalUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditPortalUser = (user: PortalUserRow) => {
    setSelectedPortalUserId(user.id);
    setEditDrawerOpen(true);
  };

  const handleRemoveLink = (overleafUserId: string) => {
    setLinkedOverleafUsers((prev) =>
      prev.filter((link) => link.overleafUserId !== overleafUserId),
    );
  };

  const handleAddOverleafLink = (link: PortalUserLinkState) => {
    setLinkedOverleafUsers((prev) => {
      if (prev.some((item) => item.overleafUserId === link.overleafUserId)) {
        return prev;
      }
      return [...prev, link];
    });
    setOverleafSearchTerm("");
    setDebouncedOverleafSearchTerm("");
  };

  const handleSavePortalUser = () => {
    if (!selectedPortalUserId) return;
    if (!formState.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formState.email.trim()) {
      toast.error("Email is required");
      return;
    }

    updatePortalUserMutation.mutate({
      id: selectedPortalUserId,
      name: formState.name.trim(),
      email: formState.email.trim(),
      role: formState.role,
      overleafLinks: linkedOverleafUsers,
    });
  };

  const statsLoading =
    portalUserStatsLoading || typeof portalUserStats === "undefined";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Portal Users
            </CardTitle>
            <IconUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <IconLoader className="h-5 w-5 animate-spin" />
              ) : (
                portalUserStats.totalUsers
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accounts managed within the portal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <IconCertificate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <IconLoader className="h-5 w-5 animate-spin" />
              ) : (
                portalUserStats.superAdmins
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Users with full administrative access
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Linked Portal Users
            </CardTitle>
            <IconLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <IconLoader className="h-5 w-5 animate-spin" />
              ) : (
                portalUserStats.linkedPortalUsers
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Portal accounts linked to Overleaf users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Overleaf Links
            </CardTitle>
            <IconUserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <IconLoader className="h-5 w-5 animate-spin" />
              ) : (
                portalUserStats.totalLinks
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Individual Overleaf associations
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mx-4 lg:mx-6">
        <CardContent className="p-6">
          <PortalUsersDataTable
            data={portalUsersData?.users ?? []}
            loading={portalUsersLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={portalUsersData?.total ?? 0}
            searchTerm={searchTerm}
            onPageChange={setCurrentPage}
            onSearchChange={setSearchTerm}
            onEdit={handleEditPortalUser}
          />
        </CardContent>
      </Card>

      <Drawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        direction="right"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Portal User</DrawerTitle>
            <DrawerDescription>
              Update portal user details and manage Overleaf associations.
            </DrawerDescription>
          </DrawerHeader>
          {selectedPortalUserLoading ? (
            <div className="flex items-center justify-center py-10">
              <IconLoader className="mr-2 h-5 w-5 animate-spin" />
              <span>Loading portal user...</span>
            </div>
          ) : selectedPortalUserError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-destructive">
              <IconRefresh className="h-5 w-5" />
              <p>{selectedPortalUserError.message}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="portal-user-name">Name</Label>
                  <Input
                    id="portal-user-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal-user-email">Email</Label>
                  <Input
                    id="portal-user-email"
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal-user-role">Role</Label>
                  <Select
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        role: value as "user" | "super-admin",
                      }))
                    }
                  >
                    <SelectTrigger id="portal-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="super-admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">
                      Linked Overleaf Users
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Associate this portal user with one or more Overleaf
                      users.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedPortalUserId) {
                        setLinkedOverleafUsers([]);
                      }
                    }}
                  >
                    <IconRefresh className="mr-2 h-4 w-4" />
                    Clear Links
                  </Button>
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {linkedOverleafUsers.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        No Overleaf users linked yet.
                      </span>
                    )}
                    {linkedOverleafUsers.map((link) => (
                      <Badge
                        key={link.overleafUserId}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {link.overleafUserEmail ?? link.overleafUserId}
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleRemoveLink(link.overleafUserId)}
                          aria-label="Remove link"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="overleaf-search">
                        Search Overleaf Users
                      </Label>
                      <Input
                        id="overleaf-search"
                        value={overleafSearchTerm}
                        onChange={(event) =>
                          setOverleafSearchTerm(event.target.value)
                        }
                        placeholder="Type email to search..."
                      />
                      {overleafSearchLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IconLoader className="h-4 w-4 animate-spin" />
                          Searching Overleaf users...
                        </div>
                      ) : debouncedOverleafSearchTerm.length >= 2 &&
                        (overleafSearchResults?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No matching Overleaf users found.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {overleafSearchResults?.map((user) => (
                            <Button
                              key={user._id}
                              variant="ghost"
                              className="justify-start"
                              onClick={() =>
                                handleAddOverleafLink({
                                  overleafUserId: user._id,
                                  overleafUserEmail: user.email ?? null,
                                })
                              }
                            >
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {user.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.first_name || user.last_name
                                    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                                    : user._id}
                                </span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          <DrawerFooter className="gap-2">
            <Button
              onClick={handleSavePortalUser}
              disabled={
                updatePortalUserMutation.isPending || selectedPortalUserLoading
              }
            >
              {updatePortalUserMutation.isPending && (
                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
