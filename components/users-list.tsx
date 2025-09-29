"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconLoader,
  IconMail,
  IconPlus,
  IconSearch,
  IconShield,
  IconTrash,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export function UsersList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, _setPageSize] = useState(25);
  const [searchEmail, setSearchEmail] = useState("");
  const [debouncedSearchEmail, setDebouncedSearchEmail] = useState("");
  const [sortBy, setSortBy] = useState<
    "email" | "signUpDate" | "lastLoggedIn" | "loginCount"
  >("signUpDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userDetailsDrawerOpen, setUserDetailsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    isAdmin: false,
  });

  // Debounce search email
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchEmail(searchEmail);
      setCurrentPage(0); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchEmail]);

  // Reset page when sort changes
  useEffect(() => {
    setCurrentPage(0);
  }, []);

  // Queries
  const {
    data: usersData,
    isLoading,
    refetch,
  } = trpc.user.list.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    searchEmail: debouncedSearchEmail || undefined,
    sortBy,
    sortOrder,
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
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value: any) => setSortBy(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signUpDate">Sign Up Date</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="lastLoggedIn">Last Login</SelectItem>
              <SelectItem value="loginCount">Login Count</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(value: any) => setSortOrder(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Login Count</TableHead>
                  <TableHead>Sign Up Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users?.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{user.email}</div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-muted-foreground">
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          ID: {user._id.slice(-8)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLoggedIn
                        ? new Date(user.lastLoggedIn).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>{user.loginCount || 0}</TableCell>
                    <TableCell>
                      {user.signUpDate
                        ? new Date(user.signUpDate).toLocaleDateString()
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <IconEdit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewUserDetails(user)}
                          >
                            <IconMail className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconEdit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <IconTrash className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.email}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.email)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{" "}
            {Math.min((currentPage + 1) * pageSize, usersData?.total || 0)} of{" "}
            {usersData?.total || 0} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <IconChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
