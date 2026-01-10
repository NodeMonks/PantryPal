import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Copy,
  MoreVertical,
} from "lucide-react";
import { JWTAuthProvider, useJWTAuth } from "../contexts/JWTAuthContext";
import { OrgIdDisplay } from "@/components/OrgIdDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "inventory_manager",
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.full_name &&
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) =>
        statusFilter === "active" ? user.is_active : !user.is_active
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/auth/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("User created successfully");
        setIsDialogOpen(false);
        setNewUser({
          username: "",
          email: "",
          password: "",
          role: "inventory_manager",
          full_name: "",
          phone: "",
        });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Failed to create user:", error);
      toast.error("Failed to create user");
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/auth/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success(isActive ? "User deactivated" : "User activated");
        fetchUsers();
      } else {
        toast.error("Failed to update user status");
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: any;
        color: string;
      }
    > = {
      admin: {
        variant: "destructive",
        icon: ShieldAlert,
        color: "bg-red-100 text-red-700 dark:bg-red-900/30",
      },
      store_manager: {
        variant: "default",
        icon: ShieldCheck,
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30",
      },
      inventory_manager: {
        variant: "secondary",
        icon: Shield,
        color: "bg-green-100 text-green-700 dark:bg-green-900/30",
      },
      cashier: {
        variant: "outline",
        icon: UserCog,
        color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30",
      },
    };
    const config = variants[role] || variants.cashier;
    const Icon = config.icon;

    return (
      <Badge className={`gap-1 ${config.color} border-0`}>
        <Icon className="h-3 w-3" />
        {role}
      </Badge>
    );
  };

  if (!hasRole("admin", "store_manager")) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access user management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    byRole: {
      admin: users.filter((u) => u.role === "admin").length,
      store_manager: users.filter((u) => u.role === "store_manager").length,
      inventory_manager: users.filter((u) => u.role === "inventory_manager")
        .length,
      cashier: users.filter((u) => u.role === "cashier").length,
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrgIdDisplay variant="badge" />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Users */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">
                    Total Users
                  </p>
                  <h3 className="text-3xl md:text-4xl font-bold mt-2">
                    {stats.total}
                  </h3>
                  <p className="text-orange-100 text-xs mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />+
                    {stats.byRole.admin + stats.byRole.store_manager} admins
                  </p>
                </div>
                <div className="h-14 w-14 md:h-16 md:w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Users className="h-7 w-7 md:h-8 md:w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Active Users
                  </p>
                  <h3 className="text-3xl md:text-4xl font-bold mt-2 text-green-600">
                    {stats.active}
                  </h3>
                  <p className="text-gray-500 text-xs mt-2">
                    Currently enabled
                  </p>
                </div>
                <div className="h-14 w-14 md:h-16 md:w-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                  <UserCheck className="h-7 w-7 md:h-8 md:w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    Inactive
                  </p>
                  <h3 className="text-3xl md:text-4xl font-bold mt-2 text-red-600">
                    {stats.inactive}
                  </h3>
                  <p className="text-gray-500 text-xs mt-2">Deactivated</p>
                </div>
                <div className="h-14 w-14 md:h-16 md:w-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <UserX className="h-7 w-7 md:h-8 md:w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-5 md:p-6">
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  Quick Actions
                </p>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the organization
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={newUser.username}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                username: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role">Role *</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="store_manager">
                                Store Manager
                              </SelectItem>
                              <SelectItem value="inventory_manager">
                                Inventory Manager
                              </SelectItem>
                              <SelectItem value="cashier">Cashier</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={newUser.full_name}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                full_name: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={newUser.phone}
                            onChange={(e) =>
                              setNewUser({ ...newUser, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          Create User
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={isInviteDialogOpen}
                  onOpenChange={setIsInviteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Invite User</DialogTitle>
                      <DialogDescription>
                        Send an invitation link to a user to join your
                        organization
                      </DialogDescription>
                    </DialogHeader>
                    <JWTAuthProvider>
                      <InviteUserForm
                        onSuccessLink={() => toast.success("Invite created")}
                      />
                    </JWTAuthProvider>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Search & Filter Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store_manager">Store Manager</SelectItem>
                    <SelectItem value="inventory_manager">
                      Inventory Manager
                    </SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl">All Users</CardTitle>
                <CardDescription className="mt-1.5">
                  Showing {filteredUsers.length} of {users.length} users
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="font-semibold">Username</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Full Name</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 border-0"
                              : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 border-0"
                          }
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                toggleUserStatus(user.id, user.is_active)
                              }
                              className={
                                user.is_active
                                  ? "text-red-600"
                                  : "text-green-600"
                              }
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Invite User Form Component
function InviteUserForm({
  onSuccessLink,
}: {
  onSuccessLink?: (link: string) => void;
}) {
  const { accessToken, login, orgId, refresh } = useJWTAuth();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [org, setOrg] = useState<string>("");
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "validating" | "sending" | "success"
  >("idle");

  useEffect(() => {
    if (orgId && !org) setOrg(orgId);
  }, [orgId, org]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/rbac/roles", {
          credentials: "include",
        });
        if (!res.ok) {
          setRoles([]);
          return;
        }
        const data = await res.json();
        if (!ignore) setRoles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load roles:", err);
        if (!ignore) setRoles([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(adminEmail, adminPassword);
    } catch (e: any) {
      setError(e.message || "Login failed");
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return setError("Org ID required");
    if (!roleId) return setError("Select a role");
    if (!fullName.trim()) return setError("Full name required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim()))
      return setError("Enter a valid email");

    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(
      /\/$/,
      ""
    );
    const inviteEndpoint = `${apiBase}/api/org/invite`;
    setError(null);
    setStatus("validating");
    setSending(true);

    // Simulate validation delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    setStatus("sending");

    const res = await fetch(apiBase ? inviteEndpoint : "/api/org/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        org_id: org,
        email: inviteEmail,
        role_id: Number(roleId),
        full_name: fullName,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("idle");
      setSending(false);
      return setError(data?.error || "Invite failed");
    }

    setStatus("success");
    if (onSuccessLink) onSuccessLink(data.link);

    // Reset form after 2 seconds
    setTimeout(() => {
      setSending(false);
      setStatus("idle");
      setInviteEmail("");
      setFullName("");
      setRoleId("");
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onInvite} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Org ID</Label>
            <Input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Invitee Email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label>Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roles.length === 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              No assignable roles available. You may lack permission to assign
              roles.
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={sending || roles.length === 0}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          {status === "validating" && (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Validating...
            </>
          )}
          {status === "sending" && (
            <>
              <span className="inline-block animate-spin mr-2">📧</span>
              Sending invite...
            </>
          )}
          {status === "success" && (
            <>
              <span className="mr-2">✅</span>
              Invite sent!
            </>
          )}
          {status === "idle" && "Send Invite"}
        </Button>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
