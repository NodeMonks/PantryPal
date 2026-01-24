import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download,
  TrendingUp,
  IndianRupee,
  Users,
  Package,
  ShoppingCart,
  Store,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  period: string;
  totalRevenue: number;
  totalBills: number;
  averageBillValue: number;
  uniqueCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  topProducts: Array<{
    name: string;
    category: string;
    quantity: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    name: string;
    value: number;
  }>;
  dailySales: Array<{
    date: string;
    revenue: number;
    billCount: number;
  }>;
  revenueByPaymentMethod: Array<{
    name: string;
    value: number;
  }>;
  topCustomers: Array<{
    name: string;
    spent: number;
    billCount: number;
  }>;
  totalStores: number;
  storeNames: string[];
}

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#eab308",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
];

export default function Reports() {
  const { user } = useAuth();
  const [reportPeriod, setReportPeriod] = useState<string>("30");
  const { toast } = useToast();

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<AnalyticsData>({
    queryKey: ["analytics", reportPeriod],
    queryFn: async () => {
      console.log(
        "🔍 Fetching analytics for period:",
        reportPeriod,
        "User org:",
        user?.org_id,
      );
      const res = await fetch(`/api/analytics?days=${reportPeriod}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Analytics API error:", res.status, errorText);
        throw new Error("Failed to fetch analytics");
      }
      const data = await res.json();
      console.log("📊 Analytics data received:", data);
      return data;
    },
    enabled: !!user?.org_id,
  });

  console.log("📈 Reports state:", {
    isLoading,
    hasError: !!error,
    hasData: !!analytics,
    user: user?.org_id,
  });

  const exportReport = () => {
    if (!analytics) return;

    const reportText = `
PantryPal Business Analytics Report
${analytics.period}
Organization: ${user?.org_id}
Generated: ${new Date().toLocaleString("en-IN")}

SUMMARY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Revenue: ₹${analytics.totalRevenue.toLocaleString("en-IN")}
Total Bills: ${analytics.totalBills}
Average Bill Value: ₹${analytics.averageBillValue.toLocaleString("en-IN")}
Total Stores: ${analytics.totalStores}

CUSTOMER METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unique Customers: ${analytics.uniqueCustomers}
New Customers: ${analytics.newCustomers}
Repeat Customers: ${analytics.repeatCustomers}

TOP SELLING PRODUCTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analytics.topProducts
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} (${p.category}) - ${p.quantity} units, ₹${p.revenue.toLocaleString("en-IN")}`,
  )
  .join("\n")}

TOP CUSTOMERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analytics.topCustomers
  .map(
    (c, i) =>
      `${i + 1}. ${c.name} - ₹${c.spent.toLocaleString("en-IN")} (${c.billCount} bills)`,
  )
  .join("\n")}

REVENUE BY CATEGORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analytics.revenueByCategory
  .map((c) => `${c.name}: ₹${c.value.toLocaleString("en-IN")}`)
  .join("\n")}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pantrypal-analytics-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Analytics report exported successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load analytics</p>
          <p className="text-sm text-muted-foreground">
            {(error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  // Check if there's any data at all
  const hasData = analytics.totalBills > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-orange-100 p-3 mb-4">
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Sales Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Start creating bills from the Quick POS or Billing page to see
              analytics and reports here. Your sales data, charts, and insights
              will appear once you've completed your first transaction.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => (window.location.href = "/quick-pos")}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Go to Quick POS
              </Button>
              <Button
                onClick={() => (window.location.href = "/billing")}
                variant="outline"
              >
                Go to Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {hasData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  ₹{analytics.totalRevenue.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.period}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  Total Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.totalBills}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: ₹{analytics.averageBillValue.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analytics.uniqueCustomers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.newCustomers} new
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Store className="h-4 w-4" />
                  Total Stores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.totalStores}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.storeNames.length > 0
                    ? analytics.storeNames[0]
                    : "No stores"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Daily Sales Trend
                </CardTitle>
                <CardDescription>Revenue and bill count by day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === "Revenue (₹)")
                          return `₹${value.toLocaleString("en-IN")}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f97316"
                      strokeWidth={2}
                      name="Revenue (₹)"
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="billCount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Bills"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Revenue by Category
                </CardTitle>
                <CardDescription>Top performing categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.revenueByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) =>
                        `${entry.name}: ₹${(entry.value / 1000).toFixed(1)}K`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.revenueByCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: any) =>
                        `₹${Number(value).toLocaleString("en-IN")}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>
                  By revenue in {analytics.period.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analytics.topProducts.slice(0, 5)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: any) =>
                        `₹${Number(value).toLocaleString("en-IN")}`
                      }
                    />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Payment preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.revenueByPaymentMethod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: any) =>
                        `₹${Number(value).toLocaleString("en-IN")}`
                      }
                    />
                    <Bar dataKey="value" fill="#8b5cf6" name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>
                Highest spending customers in {analytics.period.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topCustomers.slice(0, 10).map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.billCount} bills
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        ₹{customer.spent.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg: ₹
                        {Math.round(
                          customer.spent / customer.billCount,
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
