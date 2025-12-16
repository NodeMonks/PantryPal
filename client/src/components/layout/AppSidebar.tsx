import { useState } from "react";
import {
  Home,
  ShoppingBasket,
  Receipt,
  QrCode,
  Barcode,
  Users,
  BarChart3,
  AlertTriangle,
  LogOut,
  User as UserIcon,
  ShoppingCart,
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
  { title: "Inventory", url: "/inventory", icon: ShoppingBasket },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Barcode Scanner", url: "/barcode-scanner", icon: Barcode },
  { title: "QR Scanner", url: "/qr-scanner", icon: QrCode },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Expiry Alerts", url: "/expiry", icon: AlertTriangle },
  { title: "User Management", url: "/users", icon: UserIcon, adminOnly: true },
];

const quickActions = [
  { title: "New Bill", url: "/billing/new", icon: Receipt },
  { title: "Add Product", url: "/inventory/add", icon: ShoppingBasket },
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
      <SidebarHeader className="p-3 border-b border-sidebar-border flex items-center justify-center min-h-[60px]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 text-sidebar-foreground w-full">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-orange-600 text-white">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate leading-tight">
                Pantry Pal
              </h2>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                Inventory
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-orange-600 text-white">
            <ShoppingBasket className="h-5 w-5" />
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
                  <SidebarMenuItem key={item.title} className="h-9">
                    <SidebarMenuButton
                      asChild
                      className={`h-9 ${isCollapsed ? "px-2" : ""}`}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="truncate text-sm">{item.title}</span>
                        )}
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
                  <SidebarMenuItem key={item.title} className="h-9">
                    <SidebarMenuButton
                      asChild
                      className="h-9"
                      title={isCollapsed ? item.title : undefined}
                    >
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="truncate text-sm">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border min-h-[70px] flex items-end">
        {!isCollapsed && user && (
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize truncate">
                  {user.role.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/profile")}
                className="h-8 justify-start border-orange-500/40 hover:bg-orange-500/10 text-black text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1 flex-shrink-0 text-orange-600" />
                <span className="truncate">Profile</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="h-8 justify-start bg-orange-300 hover:bg-orange-700 text-black text-xs"
              >
                <LogOut className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">Logout</span>
              </Button>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="space-y-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0"
              title={user.full_name || user.username}
            >
              <UserIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="h-8 w-8 border-orange-500/50 hover:bg-orange-500/10 flex-shrink-0"
              title="Profile"
            >
              <UserIcon className="h-4 w-4 text-orange-600" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
