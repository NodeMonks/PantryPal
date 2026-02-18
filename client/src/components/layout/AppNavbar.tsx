import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  RotateCcw,
  FastForward,
  Download,
  Menu,
  X,
  ChevronDown,
  Zap,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RefreshButton } from "@/components/RefreshButton";

/* ─── Active link styles ─────────────────────────────────────────── */
const navLinkCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
    isActive
      ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
      : "text-muted-foreground hover:text-foreground hover:bg-accent",
  );

/* ─── Mobile drawer nav link ─────────────────────────────────────── */
const drawerNavCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150",
    isActive
      ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
      : "text-foreground hover:bg-accent",
  );

/* ─── Component ──────────────────────────────────────────────────── */
export function AppNavbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout, hasRole } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Translate nav items dynamically
  const menuItems = [
    { titleKey: "nav.dashboard", url: "/", icon: Home },
    { titleKey: "nav.inventory", url: "/inventory", icon: ShoppingBasket },
    { titleKey: "nav.billing", url: "/billing", icon: Receipt },
    { titleKey: "nav.barcode", url: "/barcode-scanner", icon: Barcode },
    { titleKey: "nav.qrScanner", url: "/qr-scanner", icon: QrCode },
    { titleKey: "nav.customers", url: "/customers", icon: Users },
    { titleKey: "nav.returns", url: "/returns", icon: RotateCcw },
    { titleKey: "nav.reports", url: "/reports", icon: BarChart3 },
    { titleKey: "nav.expiry", url: "/expiry", icon: AlertTriangle },
    { titleKey: "nav.users", url: "/users", icon: UserIcon, adminOnly: true },
  ] as const;

  const quickActions = [
    {
      titleKey: "nav.quickPos",
      url: "/quick-pos",
      icon: FastForward,
      descKey: "Quick POS — Lightning-fast checkout",
    },
    {
      titleKey: "nav.posDashboard",
      url: "/pos-dashboard",
      icon: BarChart3,
      descKey: "POS Dashboard — Sales overview",
    },
    {
      titleKey: "nav.newBill",
      url: "/billing/new",
      icon: Receipt,
      descKey: "Create a bill",
    },
    {
      titleKey: "nav.addProduct",
      url: "/inventory/add",
      icon: ShoppingBasket,
      descKey: "Add to inventory",
      inventoryOnly: true,
    },
  ] as const;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const visibleMenu = menuItems.filter((item) => {
    if (item.titleKey === "nav.users") return hasRole("admin", "store_manager");
    return !("adminOnly" in item && item.adminOnly) || hasRole("admin");
  });

  const visibleQuickActions = quickActions.filter((item) => {
    if ("inventoryOnly" in item && item.inventoryOnly)
      return hasRole("admin", "inventory_manager");
    return hasRole("admin", "store_manager", "inventory_manager");
  });

  return (
    /* Floating navbar – sticky with margin so it "floats" above the page */
    <header className="sticky top-3 z-50 mx-3 md:mx-6">
      <nav className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]">
        {/* ── Logo ── */}
        <NavLink
          to="/"
          className="flex items-center gap-2 shrink-0 mr-1 group"
          end
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm group-hover:bg-orange-600 transition-colors">
            <ShoppingBasket className="h-4 w-4" />
          </span>
          <span className="hidden sm:block font-bold text-sm leading-tight">
            Pantry<span className="text-orange-500">Pal</span>
          </span>
        </NavLink>

        {/* ── Horizontal menu (hidden on mobile) ── */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {visibleMenu.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={navLinkCls}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {isActive && (
                    <span className="text-sm">{t(item.titleKey)}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* ── Spacer on non-lg ── */}
        <div className="flex-1 lg:hidden" />

        {/* ── Right side actions ── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
              >
                <Zap className="h-3.5 w-3.5 text-orange-500" />
                <span className="hidden md:inline">Quick</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">
                {t("nav.quickActions")}
              </DropdownMenuLabel>
              {visibleQuickActions.map((item) => (
                <DropdownMenuItem
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-tight">
                      {t(item.titleKey)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.descKey}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh data */}
          <RefreshButton showLabel />

          {/* Language Switcher */}
          <LanguageSwitcher compact />

          {/* Install PWA */}
          {isInstallable && (
            <Button
              size="sm"
              onClick={install}
              className="hidden sm:flex h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg animate-pulse"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
          )}

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-accent transition-colors group">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold shrink-0">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </span>
                  <div className="hidden md:flex flex-col text-left min-w-0">
                    <span className="text-xs font-semibold leading-tight truncate max-w-[100px]">
                      {user.full_name || user.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                      {user.role.replace(/_/g, " ")}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 opacity-40 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-xl p-1.5"
              >
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-semibold truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role.replace(/_/g, " ")}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  {t("nav.profile")}
                </DropdownMenuItem>
                {isInstallable && (
                  <DropdownMenuItem
                    onClick={install}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer sm:hidden"
                  >
                    <Download className="h-4 w-4 text-blue-500" />
                    {t("nav.installApp")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* ── Mobile hamburger ── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 rounded-lg"
                aria-label="Open menu"
              >
                {mobileOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 rounded-r-2xl">
              <div className="flex flex-col h-full">
                {/* Drawer header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                    <ShoppingBasket className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold text-base leading-tight">
                      Pantry<span className="text-orange-500">Pal</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("nav.pantrySubtitle")}
                    </p>
                  </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pb-1 pt-1">
                    {t("nav.menu")}
                  </p>
                  {visibleMenu.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      end={item.url === "/"}
                      className={drawerNavCls}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      {t(item.titleKey)}
                    </NavLink>
                  ))}

                  <div className="pt-3 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pb-1">
                      {t("nav.quickActions")}
                    </p>
                  </div>
                  {visibleQuickActions.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      className={drawerNavCls}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      {t(item.titleKey)}
                    </NavLink>
                  ))}
                </nav>

                {/* Drawer footer – user */}
                {user && (
                  <div className="border-t px-3 py-3 space-y-2">
                    {isInstallable && (
                      <Button
                        size="sm"
                        onClick={() => {
                          install();
                          setMobileOpen(false);
                        }}
                        className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold animate-pulse"
                      >
                        <Download className="h-3.5 w-3.5 mr-2" />
                        {t("nav.installApp")}
                      </Button>
                    )}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold shrink-0">
                        {(user.full_name || user.username)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {user.role.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate("/profile");
                          setMobileOpen(false);
                        }}
                        className="h-8 text-xs rounded-lg border-orange-200 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-950/30"
                      >
                        <UserIcon className="h-3 w-3 mr-1.5 text-orange-500" />
                        {t("nav.profile")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="h-8 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <LogOut className="h-3 w-3 mr-1.5" />
                        {t("nav.signOut")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
