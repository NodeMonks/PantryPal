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
} from "lucide-react";
import { JWTAuthProvider, useJWTAuth } from "../contexts/JWTAuthContext";
import { OrgIdDisplay } from "@/components/OrgIdDisplay";

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
    // Filter users based on search and filters
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.full_name &&
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.is_active === (statusFilter === "active")
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
        credentials: "include",
        body: JSON.stringify(newUser),
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

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success("User role updated");
        fetchUsers();
      } else {
        toast.error("Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    const endpoint = isActive
      ? `/api/auth/users/${userId}/deactivate`
      : `/api/auth/users/${userId}/activate`;

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
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
      }
    > = {
      admin: { variant: "destructive", icon: ShieldAlert },
      store_manager: { variant: "default", icon: ShieldCheck },
      inventory_manager: { variant: "secondary", icon: Shield },
      cashier: { variant: "outline", icon: UserCog },
    };
    const config = variants[role] || variants.cashier;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
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

  return (
    <div className="p-6 space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end shrink-0">
          <OrgIdDisplay variant="inline" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user account to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      required
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, full_name: e.target.value })
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
                </div>
                <DialogFooter>
                  <Button type="submit">Create User</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="secondary">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invitation link to a user to join your organization
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
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} user
            {users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Table className="w-full table-fixed text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap w-[16%]">
                    Username
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[22%]">
                    Email
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[16%]">
                    Full Name
                  </TableHead>
                  <TableHead className="w-[12%]">Role</TableHead>
                  <TableHead className="whitespace-nowrap w-[16%]">
                    Status
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[10%]">
                    Created
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[8%]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm ||
                      roleFilter !== "all" ||
                      statusFilter !== "all"
                        ? "No users found matching your filters."
                        : "No users in the system."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell
                        className="font-medium max-w-[220px] truncate"
                        title={user.username}
                      >
                        {user.username}
                      </TableCell>
                      <TableCell
                        className="max-w-[260px] truncate"
                        title={user.email}
                      >
                        {user.email}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate"
                        title={user.full_name || "-"}
                      >
                        {user.full_name || "-"}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant={user.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() =>
                              handleToggleActive(user.id, user.is_active)
                            }
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap items-center">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              handleUpdateRole(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-36">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// A compact invite form reusing JWT auth to call /org/invite
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
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [org, setOrg] = useState<string>("");
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // auto-fill org from context
  useEffect(() => {
    if (orgId && !org) setOrg(orgId);
  }, [orgId, org]);

  useEffect(() => {
    if (!accessToken) return;
    let ignore = false;
    (async () => {
      async function loadRoles(token: string) {
        const res = await fetch("/rbac/roles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return null; // signal to refresh
        if (!res.ok) {
          // Gracefully degrade: no roles available (likely 403 or server issue)
          return [] as { id: number; name: string }[];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }

      let data = await loadRoles(accessToken);
      if (data === null) {
        try {
          await refresh();
          // re-read latest token from context state after refresh
          const newToken = localStorage.getItem("jwt_access");
          if (newToken) data = await loadRoles(newToken);
        } catch {
          data = [];
        }
      }
      if (!ignore) setRoles(Array.isArray(data) ? data : []);
    })();
    return () => {
      ignore = true;
    };
  }, [accessToken, refresh]);

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
    if (!accessToken) return setError("Please login first");
    if (!org) return setError("Org ID required");
    if (!roleId) return setError("Select a role");
    if (!fullName.trim()) return setError("Full name required");
    if (!phone.trim()) return setError("Phone required");
    setError(null);
    setSending(true);
    const res = await fetch("/org/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        org_id: org,
        email: inviteEmail,
        role_id: Number(roleId),
        full_name: fullName,
        phone,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) return setError(data?.error || "Invite failed");
    if (onSuccessLink) onSuccessLink(data.link);
  };

  return (
    <div className="space-y-4">
      {!accessToken ? (
        <form onSubmit={onLogin} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Admin Email</Label>
              <Input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit">Login</Button>
        </form>
      ) : (
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
            <div>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
          <Button type="submit" disabled={sending || roles.length === 0}>
            {sending ? "Verifying and sending (5s)..." : "Send Invite"}
          </Button>
        </form>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}

// Inline org id badge used in the All Users header
function OrgIdInline() {
  const { orgId: jwtOrgId } = useJWTAuth();
  const [orgId, setOrgId] = useState<string | null>(jwtOrgId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (jwtOrgId) {
      setOrgId(jwtOrgId);
      return;
    }
    // Fallback: fetch org for session-auth users
    fetch("/api/org/current", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ orgId: null })))
      .then((d) => setOrgId(d?.orgId ?? null))
      .catch(() => setOrgId(null));
  }, [jwtOrgId]);

  if (!orgId) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(orgId || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const short =
    orgId.length > 10 ? `${orgId.slice(0, 8)}…${orgId.slice(-4)}` : orgId;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium">Org:</span>
      <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">
        {short}
      </code>
      <button
        type="button"
        onClick={copy}
        className="px-1.5 py-0.5 rounded border text-foreground/70 hover:bg-muted"
        title="Copy Org ID"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
