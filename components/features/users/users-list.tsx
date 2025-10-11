"use client";

import {
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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";
import { UsersDataTable } from "./users-table/data-table";

export function UsersList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, _setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userDetailsDrawerOpen, setUserDetailsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  } = trpc.user.list.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    searchEmail: debouncedSearchTerm || undefined,
  });

  const { data: userStats } = trpc.user.getStats.useQuery();

  // Mutations
  const createUserMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setNewUser({ email: "", firstName: "", lastName: "", isAdmin: false });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
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

  const handleViewUserDetails = (user: any) => {
    setSelectedUser(user);
    setUserDetailsDrawerOpen(true);
  };

  const totalPages = Math.ceil((usersData?.total || 0) / pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with stats */}
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
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
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
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
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
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
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account. The user will be notified via email.
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
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card className="mx-4 lg:mx-6">
        <CardContent className="p-6">
          <UsersDataTable
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
            onDelete={handleDeleteUser}
          />
        </CardContent>
      </Card>

      {/* User Details Drawer */}
      <Drawer
        open={userDetailsDrawerOpen}
        onOpenChange={setUserDetailsDrawerOpen}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>User Details</DrawerTitle>
            <DrawerDescription>
              {selectedUser?.email || "No user selected"}
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
                      <div className="text-muted-foreground">User ID</div>
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

                {/* Features */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Features & Permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Collaborators</div>
                      <div className="font-medium">
                        {selectedUser.features?.collaborators === -1
                          ? "Unlimited"
                          : selectedUser.features?.collaborators || "Limited"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Compile Timeout
                      </div>
                      <div className="font-medium">
                        {selectedUser.features?.compileTimeout || 180}s
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Versioning</div>
                      <div className="font-medium">
                        <Badge
                          variant={
                            selectedUser.features?.versioning
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedUser.features?.versioning
                            ? "Enabled"
                            : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Track Changes</div>
                      <div className="font-medium">
                        <Badge
                          variant={
                            selectedUser.features?.trackChanges
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedUser.features?.trackChanges
                            ? "Enabled"
                            : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Addresses */}
                {selectedUser.emails && selectedUser.emails.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Email Addresses</h4>
                    <div className="space-y-2">
                      {selectedUser.emails.map(
                        (emailObj: any, index: number) => (
                          <div
                            key={index}
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
    </div>
  );
}
