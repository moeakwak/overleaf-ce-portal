"use client";

import {
  IconKey,
  IconLoader,
  IconPlus,
  IconShield,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { type RouterOutputs, trpc } from "@/lib/trpc/client";
import { OverleafUsersDataTable } from "./overleaf-users-table/data-table";

type OverleafUserRow = RouterOutputs["overleafUser"]["list"]["users"][number];
type OverleafUserEmailEntry = NonNullable<OverleafUserRow["emails"]>[number];

export function OverleafUsersList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, _setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userDetailsDrawerOpen, setUserDetailsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OverleafUserRow | null>(
    null,
  );
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OverleafUserRow | null>(null);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    isAdmin: false,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Queries
  const {
    data: usersData,
    isLoading,
    refetch,
  } = trpc.overleafUser.list.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    searchEmail: debouncedSearchTerm || undefined,
  });

  const { data: userStats } = trpc.overleafUser.getStats.useQuery();

  // Mutations
  const createUserMutation = trpc.overleafUser.create.useMutation({
    onSuccess: () => {
      toast.success("Overleaf user created successfully");
      setCreateDialogOpen(false);
      setNewUser({ email: "", firstName: "", lastName: "", isAdmin: false });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = trpc.overleafUser.delete.useMutation({
    onSuccess: () => {
      toast.success("Overleaf user deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAdminStatusMutation =
    trpc.overleafUser.updateAdminStatus.useMutation({
      onSuccess: () => {
        toast.success("Admin status updated successfully");
        setEditingUser((prev) =>
          prev ? { ...prev, isAdmin: editIsAdmin } : prev,
        );
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const setPasswordMutation = trpc.overleafUser.setPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setNewPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email) {
      toast.error("Email is required");
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleDeleteUser = (email: string) => {
    deleteUserMutation.mutate({ email, skipEmail: false });
  };

  const handleViewUserDetails = (user: OverleafUserRow) => {
    setSelectedUser(user);
    setUserDetailsDrawerOpen(true);
  };

  const handleEditUser = (user: OverleafUserRow) => {
    setEditingUser(user);
    setEditIsAdmin(Boolean(user.isAdmin));
    setNewPassword("");
    setEditDrawerOpen(true);
  };

  useEffect(() => {
    if (!editDrawerOpen) {
      setEditingUser(null);
      setEditIsAdmin(false);
      setNewPassword("");
    }
  }, [editDrawerOpen]);

  const handleSaveAdminStatus = () => {
    if (!editingUser) return;
    updateAdminStatusMutation.mutate({
      email: editingUser.email,
      isAdmin: editIsAdmin,
    });
  };

  const handleSetPassword = () => {
    if (!editingUser) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    setPasswordMutation.mutate({
      email: editingUser.email,
      password: newPassword,
    });
  };

  const totalPages = Math.ceil((usersData?.total || 0) / pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with stats */}
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Overleaf Users
            </CardTitle>
            <IconUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats?.newUsersThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Overleaf Users
            </CardTitle>
            <IconUserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Admin Overleaf Users
            </CardTitle>
            <IconShield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.adminUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              System administrators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-end gap-4 px-4 lg:px-6">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus className="mr-2 h-4 w-4" />
              Create Overleaf User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Overleaf User</DialogTitle>
              <DialogDescription>
                Create a new Overleaf user account via the toolkit scripts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="col-span-3"
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, firstName: e.target.value })
                  }
                  className="col-span-3"
                  placeholder="John"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, lastName: e.target.value })
                  }
                  className="col-span-3"
                  placeholder="Doe"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isAdmin" className="text-right">
                  Admin
                </Label>
                <Switch
                  id="isAdmin"
                  checked={newUser.isAdmin}
                  onCheckedChange={(checked) =>
                    setNewUser({ ...newUser, isAdmin: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending && (
                  <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Overleaf User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overleaf Users Table */}
      <Card className="mx-4 lg:mx-6">
        <CardContent className="p-6">
          <OverleafUsersDataTable
            data={usersData?.users || []}
            loading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={usersData?.total || 0}
            searchTerm={searchTerm}
            onPageChange={setCurrentPage}
            onSearchChange={setSearchTerm}
            onViewDetails={handleViewUserDetails}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        </CardContent>
      </Card>

      {/* User Details Drawer */}
      <Drawer
        open={userDetailsDrawerOpen}
        onOpenChange={setUserDetailsDrawerOpen}
        direction="right"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Overleaf User Details</DrawerTitle>
            <DrawerDescription>
              {selectedUser?.email || "No Overleaf user selected"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {selectedUser && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Email</div>
                      <div className="font-medium">{selectedUser.email}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Role</div>
                      <div className="font-medium">
                        <Badge
                          variant={
                            selectedUser.isAdmin ? "default" : "secondary"
                          }
                        >
                          {selectedUser.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">First Name</div>
                      <div className="font-medium">
                        {selectedUser.first_name || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Name</div>
                      <div className="font-medium">
                        {selectedUser.last_name || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Overleaf User ID
                      </div>
                      <div className="font-mono text-xs">
                        {selectedUser._id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Activity Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sign Up Date</div>
                      <div className="font-medium">
                        {selectedUser.signUpDate
                          ? new Date(
                              selectedUser.signUpDate,
                            ).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Login</div>
                      <div className="font-medium">
                        {selectedUser.lastLoggedIn
                          ? new Date(
                              selectedUser.lastLoggedIn,
                            ).toLocaleDateString()
                          : "Never"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Login Count</div>
                      <div className="font-medium">
                        {selectedUser.loginCount || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Active</div>
                      <div className="font-medium">
                        {selectedUser.lastActive
                          ? new Date(
                              selectedUser.lastActive,
                            ).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CE-specific feature fields intentionally omitted. */}

                {/* Email Addresses */}
                {selectedUser.emails && selectedUser.emails.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Email Addresses</h4>
                    <div className="space-y-2">
                      {selectedUser.emails.map(
                        (emailObj: OverleafUserEmailEntry, index: number) => (
                          <div
                            key={
                              emailObj.email ?? `${selectedUser._id}-${index}`
                            }
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="font-mono">{emailObj.email}</div>
                            <div className="text-muted-foreground">
                              {emailObj.createdAt
                                ? new Date(
                                    emailObj.createdAt,
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Overleaf User Drawer */}
      <Drawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        direction="right"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Overleaf User</DrawerTitle>
            <DrawerDescription>
              {editingUser?.email ?? "Select an Overleaf user to edit"}
            </DrawerDescription>
          </DrawerHeader>
          {editingUser ? (
            <div className="space-y-6 p-4 pb-0">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Account Overview</h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{editingUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Admin</span>
                    <Badge variant={editIsAdmin ? "default" : "secondary"}>
                      {editIsAdmin ? "Admin" : "User"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs">{editingUser._id}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">
                        Administrator Access
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Toggle to grant or remove administrator privileges.
                      </p>
                    </div>
                    <Switch
                      checked={editIsAdmin}
                      onCheckedChange={setEditIsAdmin}
                    />
                  </div>
                  <Button
                    onClick={handleSaveAdminStatus}
                    disabled={
                      updateAdminStatusMutation.isPending || !editingUser
                    }
                  >
                    {updateAdminStatusMutation.isPending && (
                      <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Administrator Status
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Set Password</h4>
                    <p className="text-xs text-muted-foreground">
                      Directly replace the password without sending an email.
                      Minimum 8 characters.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overleaf-new-password">New Password</Label>
                    <Input
                      id="overleaf-new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter new password (min 8 chars)"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSetPassword}
                    disabled={
                      setPasswordMutation.isPending || newPassword.length === 0
                    }
                  >
                    {setPasswordMutation.isPending ? (
                      <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <IconKey className="mr-2 h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Select an Overleaf user to manage admin status or passwords.
            </div>
          )}
          <DrawerFooter className="gap-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
