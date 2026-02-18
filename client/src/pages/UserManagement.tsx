import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  MoreVertical,
} from "lucide-react";
import { OrgIdDisplay } from "@/components/OrgIdDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlanLimits } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { t } = useTranslation();
  const { hasRole, orgId } = useAuth();
  const { limits, canAddUser } = usePlanLimits();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    role: "inventory_manager",
    full_name: "",
    phone: "",
    store_id: "",
  });
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.full_name &&
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) =>
        statusFilter === "active" ? user.is_active : !user.is_active,
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

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/stores", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !newUser.email ||
      !newUser.full_name ||
      !newUser.phone ||
      !newUser.role
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newUser.phone.length < 10) {
      toast.error("Please enter a valid phone number (min 10 digits)");
      return;
    }

    try {
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          "User created successfully! Login credentials have been sent via email.",
        );
        setIsDialogOpen(false);
        setNewUser({
          email: "",
          role: "inventory_manager",
          full_name: "",
          phone: "",
          store_id: "",
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
              {t("users.title")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t("users.subtitle")}
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
                    {t("users.totalUsers")}
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
                    {t("users.activeUsers")}
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
                    {t("users.inactive")}
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
                  {t("common.quickActions")}
                </p>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("users.addUser")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t("users.addUser")}</DialogTitle>
                      <DialogDescription>
                        {t("users.subtitle")}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name *</Label>
                          <Input
                            id="full_name"
                            value={newUser.full_name}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                full_name: e.target.value,
                              })
                            }
                            placeholder="John Doe"
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
                            placeholder="john@example.com"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={newUser.phone}
                            onChange={(e) =>
                              setNewUser({ ...newUser, phone: e.target.value })
                            }
                            placeholder="+1234567890"
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

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="store_id">Store (Optional)</Label>
                          <Select
                            value={newUser.store_id || "none"}
                            onValueChange={(value) =>
                              setNewUser({
                                ...newUser,
                                store_id: value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                No specific store
                              </SelectItem>
                              {stores.map((store) => (
                                <SelectItem key={store.id} value={store.id}>
                                  {store.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Note:</strong> A secure password will be
                              automatically generated and sent to the user's
                              email address.
                            </p>
                          </div>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>{t("users.searchPlaceholder")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder={t("users.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("users.roleFilter")}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("users.allRoles")}</SelectItem>
                    <SelectItem value="admin">{t("users.admin")}</SelectItem>
                    <SelectItem value="store_manager">
                      {t("users.manager")}
                    </SelectItem>
                    <SelectItem value="inventory_manager">
                      {t("users.staff")}
                    </SelectItem>
                    <SelectItem value="cashier">
                      {t("users.cashier")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("users.statusFilter")}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("users.allStatuses")}
                    </SelectItem>
                    <SelectItem value="active">{t("users.active")}</SelectItem>
                    <SelectItem value="inactive">
                      {t("users.inactive")}
                    </SelectItem>
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
                <CardTitle className="text-xl md:text-2xl">
                  {t("users.totalUsers")}
                </CardTitle>
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
                    <TableHead className="font-semibold">
                      {t("users.username")}
                    </TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">
                      {t("common.name")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("users.role")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("users.status", "Status")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("users.joined")}
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      {t("common.actions")}
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
                          {user.is_active
                            ? t("users.active")
                            : t("users.inactive")}
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
                              {user.is_active
                                ? t("users.deactivate")
                                : t("users.activate")}
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
