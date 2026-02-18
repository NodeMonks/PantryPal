import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoadingSkeleton } from "@/components/ui/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Product, type Bill, type Customer } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Package,
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all data directly — same pattern as Inventory
  useEffect(() => {
    // Wait for auth to finish resolving before deciding what to do
    if (authLoading) return;
    // Don't fetch if not authenticated
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [productsData, billsData, customersData] = await Promise.all([
          api.getProducts(),
          api.getBills(),
          api.getCustomers(),
        ]);
        if (!cancelled) {
          setProducts(productsData);
          setBills(billsData);
          setCustomers(customersData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard load error:", err);
          toast({
            title: t("common.error"),
            description: "Failed to load dashboard data.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Derived stats
  const totalProducts = products.length;

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (p) => (p.quantity_in_stock ?? 0) <= (p.min_stock_level ?? 0),
      ),
    [products],
  );
  const lowStockCount = lowStockProducts.length;

  const today = new Date().toDateString();
  const todayBills = useMemo(
    () => bills.filter((b) => new Date(b.created_at).toDateString() === today),
    [bills],
  );
  const todaySalesRevenue = useMemo(
    () => todayBills.reduce((sum, b) => sum + Number(b.final_amount), 0),
    [todayBills],
  );
  const totalRevenue = useMemo(
    () => bills.reduce((sum, b) => sum + Number(b.final_amount), 0),
    [bills],
  );
  const totalCustomers = customers.length;

  // Expiring within 7 days
  const expiringProducts = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    const todayMs = new Date().setHours(0, 0, 0, 0);
    return products.filter((p) => {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date).getTime();
      return exp >= todayMs && exp <= cutoff.getTime();
    });
  }, [products]);

  // 7-day sales trend
  const salesData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayBills = bills.filter(
        (b) => new Date(b.created_at).toDateString() === date.toDateString(),
      );
      return {
        date: date.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
        revenue: Math.round(
          dayBills.reduce((sum, b) => sum + Number(b.final_amount), 0),
        ),
        count: dayBills.length,
      };
    });
  }, [bills]);

  // Category distribution
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) =>
      map.set(p.category, (map.get(p.category) || 0) + 1),
    );
    return Array.from(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  if (authLoading || loading) {
    return (
      <PageLoadingSkeleton
        statCols={5}
        tableRows={6}
        tableCols={4}
        showCharts
        showAction={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full font-medium">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Products */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Package className="h-4 w-4 text-white" />
              </div>
              {t("dashboard.totalProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">{totalProducts}</div>
            <p className="text-xs text-blue-200 mt-1">
              {t("dashboard.acrossCategories")}
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div
            className={`absolute inset-0 ${lowStockCount > 0 ? "bg-gradient-to-br from-orange-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-emerald-700"}`}
          />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              {t("dashboard.lowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">{lowStockCount}</div>
            <p className="text-xs text-orange-100 mt-1">
              {t("dashboard.needRestock")}
            </p>
          </CardContent>
        </Card>

        {/* Today Sales */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              {t("dashboard.todaySales")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {String.fromCharCode(8377)}
              {Math.round(todaySalesRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              {todayBills.length} {t("dashboard.bills")}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-violet-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <IndianRupee className="h-4 w-4 text-white" />
              </div>
              {t("dashboard.totalRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {String.fromCharCode(8377)}
              {Math.round(totalRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-violet-200 mt-1">
              {bills.length} {t("dashboard.bills")}
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-600" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-pink-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Users className="h-4 w-4 text-white" />
              </div>
              {t("dashboard.customers")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {totalCustomers}
            </div>
            <p className="text-xs text-pink-200 mt-1">
              {t("dashboard.activeCustomers")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Trend */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="pb-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t("dashboard.salesTrend")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("dashboard.salesTrendDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [
                    `${String.fromCharCode(8377)}${Number(value).toLocaleString()}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6, fill: "#1d4ed8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="pb-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-2">
                <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t("dashboard.productCategories")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("dashboard.productCategoriesDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No products yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expiring Products */}
        <Card className="shadow-sm border border-amber-200 dark:border-amber-800/50">
          <CardHeader className="pb-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-t-xl border-b border-amber-100 dark:border-amber-800/30">
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              {t("dashboard.expiringBatches")}
            </CardTitle>
            <CardDescription>
              {t("dashboard.expiringBatchesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {expiringProducts.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="font-medium">
                  {t("dashboard.noExpiringSoon")}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {expiringProducts.slice(0, 5).map((product) => {
                  const daysLeft = Math.ceil(
                    (new Date(product.expiry_date!).getTime() - Date.now()) /
                      (1000 * 3600 * 24),
                  );
                  return (
                    <div
                      key={product.id}
                      className={`flex justify-between items-center text-sm rounded-lg px-3 py-2 border ${daysLeft <= 3 ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40" : "bg-amber-50/60 border-amber-100 dark:bg-amber-950/10 dark:border-amber-800/30"}`}
                    >
                      <span className="font-medium text-foreground">
                        {product.name}
                      </span>
                      <Badge
                        variant={daysLeft <= 3 ? "destructive" : "secondary"}
                        className="text-xs font-semibold"
                      >
                        {daysLeft} {t("dashboard.days")}
                      </Badge>
                    </div>
                  );
                })}
                {expiringProducts.length > 5 && (
                  <Button
                    variant="link"
                    size="sm"
                    asChild
                    className="w-full text-amber-700"
                  >
                    <Link to="/inventory">
                      View all ({expiringProducts.length})
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="pb-2 bg-muted/30 rounded-t-xl border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <div className="bg-primary/10 rounded-lg p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              {t("nav.quickActions")}
            </CardTitle>
            <CardDescription>{t("dashboard.quickActionsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Button
              asChild
              className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11"
            >
              <Link to="/inventory/add">
                <span className="text-xl leading-none">+</span>
                {t("nav.addProduct")}
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-11"
            >
              <Link to="/billing/new">
                <span className="text-xl leading-none">+</span>
                {t("dashboard.createBill")}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 h-10"
            >
              <Link to="/customers">
                <span className="text-xl leading-none">+</span>
                {t("dashboard.addCustomer")}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-10"
            >
              <Link to="/reports">
                <TrendingUp className="h-4 w-4" />
                {t("dashboard.viewReports")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 dark:border-orange-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-900 dark:text-orange-200 flex items-center gap-2">
              <div className="bg-orange-100 dark:bg-orange-900/50 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              {lowStockCount} {t("dashboard.productsLowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-orange-800 dark:text-orange-300 mb-3 space-y-1 list-disc list-inside">
              {lowStockProducts.slice(0, 5).map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
              {lowStockProducts.length > 5 && (
                <li className="list-none text-xs text-muted-foreground">
                  +{lowStockProducts.length - 5} more
                </li>
              )}
            </ul>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-4">
              {t("dashboard.lowStockDesc")}
            </p>
            <Button
              asChild
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
            >
              <Link to="/inventory">{t("dashboard.reviewInventory")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
