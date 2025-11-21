import { useState } from "react";
import {
  Home,
  Package,
  Receipt,
  QrCode,
  Users,
  BarChart3,
  Settings,
  ShoppingCart,
  AlertTriangle,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "QR Scanner", url: "/qr-scanner", icon: QrCode },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Expiry Alerts", url: "/expiry", icon: AlertTriangle },
  { title: "User Management", url: "/users", icon: UserIcon, adminOnly: true },
];

const quickActions = [
  { title: "New Bill", url: "/billing/new", icon: ShoppingCart },
  { title: "Add Product", url: "/inventory/add", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Filter quick actions based on user role
  const filteredQuickActions = quickActions.filter((item) => {
    if (item.url === "/inventory/add") {
      return hasRole("admin", "inventory_manager");
    }
    return hasRole("admin", "store_manager", "inventory_manager");
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pantry Pal</h2>
              <p className="text-xs text-sidebar-foreground/70">
                Grocery Management
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white mx-auto">
            <Package className="h-6 w-6" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80">
            {!isCollapsed && "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => {
                  if (item.title === "User Management") {
                    return hasRole("admin", "store_manager");
                  }
                  return !item.adminOnly || hasRole("admin");
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/80">
              Quick Actions
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredQuickActions.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!isCollapsed && user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-white">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {user.role.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/profile")}
                className="justify-start border-orange-500/40 hover:bg-orange-500/10 text-black"
              >
                <UserIcon className="h-4 w-4 mr-2 text-orange-600" />
                Profile
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="justify-start bg-orange-300 hover:bg-orange-700 text-black"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-white"
              title={user.full_name || user.username}
            >
              <UserIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="w-full h-10 border-orange-500/50 hover:bg-orange-500/10"
              title="Profile"
            >
              <UserIcon className="h-5 w-5 text-orange-600" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleLogout}
              className="w-full h-10 bg-red-600 hover:bg-red-700 text-white"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
