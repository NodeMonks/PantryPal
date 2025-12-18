import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useProductStore } from "@/stores/productStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useBillStore } from "@/stores/billStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  IndianRupee,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SalesReport {
  period: string;
  totalRevenue: number;
  totalBills: number;
  averageBillValue: number;
  uniqueCustomers: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    revenue: number;
    billCount: number;
  }>;
  customerMetrics: {
    new: number;
    repeat: number;
    topCustomer: { name: string; spent: number } | null;
  };
}

export default function Reports() {
  const { user } = useAuth();
  const productStore = useProductStore();
  const customerStore = useCustomerStore();
  const billStore = useBillStore();

  const [reportPeriod, setReportPeriod] = useState<string>("30");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load all stores
  useEffect(() => {
    if (user?.org_id) {
      productStore.loadProducts(user.org_id);
      customerStore.loadCustomers(user.org_id);
      billStore.loadBills(user.org_id);
    }
  }, [user?.org_id]);

  // Generate report when data changes
  useEffect(() => {
    if (billStore.bills.length > 0) {
      generateReport();
    }
  }, [billStore.bills, productStore.products, customerStore.customers, reportPeriod]);

  const generateReport = () => {
    setLoading(true);
    try {
      const days = parseInt(reportPeriod);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Filter bills within period
      const periodBills = billStore.bills.filter((bill) => {
        const billDate = new Date(bill.created_at);
        return billDate >= cutoffDate;
      });

      // Calculate basic metrics
      const totalRevenue = periodBills.reduce(
        (sum, bill) => sum + Number(bill.final_amount),
        0
      );
      const averageBillValue =
        periodBills.length > 0 ? totalRevenue / periodBills.length : 0;

      // Get unique customers in period
      const customersInPeriod = new Set(
        periodBills.map((bill) => bill.customer_id).filter(Boolean)
      );

      // Find top products (based on bill items if available)
      const topProducts = productStore.products
        .map((product) => ({
          name: product.name,
          quantity: 0, // Would need bill_items to calculate
          revenue: 0,
        }))
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Generate daily sales data
      const dailyMap = new Map<string, { revenue: number; count: number }>();
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("en-IN");
        dailyMap.set(dateStr, { revenue: 0, count: 0 });
      }

      periodBills.forEach((bill) => {
        const dateStr = new Date(bill.created_at).toLocaleDateString("en-IN");
        const dayData = dailyMap.get(dateStr);
        if (dayData) {
          dayData.revenue += Number(bill.final_amount);
          dayData.count += 1;
        }
      });

      const dailySales = Array.from(dailyMap).map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue),
        billCount: data.count,
      }));

      // Customer metrics
      const newCustomers = customerStore.customers.filter((c) => {
        const custDate = new Date(c.created_at);
        return custDate >= cutoffDate;
      }).length;

      const repeatCustomers = customersInPeriod.size - newCustomers;

      const topCustomer =
        customersInPeriod.size > 0
          ? Array.from(customersInPeriod)
              .map((custId) => {
                const custBills = periodBills.filter(
                  (bill) => bill.customer_id === custId
                );
                const spent = custBills.reduce(
                  (sum, bill) => sum + Number(bill.final_amount),
                  0
                );
                const customer = customerStore.customers.find(
                  (c) => c.id === custId
                );
                return {
                  name: customer?.name || "Unknown",
                  spent,
                };
              })
              .sort((a, b) => b.spent - a.spent)[0]
          : null;

      const report: SalesReport = {
        period: `Last ${days} days`,
        totalRevenue,
        totalBills: periodBills.length,
        averageBillValue,
        uniqueCustomers: customersInPeriod.size,
        topProducts,
        dailySales,
        customerMetrics: {
          new: newCustomers,
          repeat: repeatCustomers,
          topCustomer,
        },
      };

      setSalesReport(report);
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!salesReport) return;

    const reportText = `
PantryPal Sales Report
${salesReport.period}

Summary Metrics:
- Total Revenue: ₹${salesReport.totalRevenue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}
- Total Bills: ${salesReport.totalBills}
- Average Bill Value: ₹${salesReport.averageBillValue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}
- Unique Customers: ${salesReport.uniqueCustomers}

Customer Metrics:
- New Customers: ${salesReport.customerMetrics.new}
- Repeat Customers: ${salesReport.customerMetrics.repeat}
- Top Customer: ${salesReport.customerMetrics.topCustomer?.name || "N/A"} (₹${
      salesReport.customerMetrics.topCustomer?.spent.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      }) || "0"
    })

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  if (loading && !salesReport) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Generating report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive sales and inventory reports</p>
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
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} disabled={!salesReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {salesReport && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{salesReport.totalRevenue.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{salesReport.period}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Total Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesReport.totalBills}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: ₹
                  {salesReport.averageBillValue.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesReport.uniqueCustomers}
                </div>
                <p className="text-xs text-muted-foreground">
                  {salesReport.customerMetrics.new} new
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(productStore.products.map((p) => p.category)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  {productStore.products.length} products
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trend</CardTitle>
                <CardDescription>Revenue and bill count by day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesReport.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #666" }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
                    <Bar yAxisId="right" dataKey="billCount" fill="#10b981" name="Bills" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Breakdown</CardTitle>
                <CardDescription>New vs Repeat customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Customers</span>
                    <Badge variant="outline">
                      {salesReport.customerMetrics.new}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Repeat Customers</span>
                    <Badge variant="secondary">
                      {salesReport.customerMetrics.repeat}
                    </Badge>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Top Customer</span>
                    </div>
                    {salesReport.customerMetrics.topCustomer ? (
                      <div className="mt-2 p-2 bg-muted rounded">
                        <p className="text-sm font-medium">
                          {salesReport.customerMetrics.topCustomer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Spent: ₹
                          {salesReport.customerMetrics.topCustomer.spent.toLocaleString(
                            "en-IN",
                            { maximumFractionDigits: 2 }
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">
                        No customer data
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Report Period:</span>
                    <span className="font-medium">{salesReport.period}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium">
                      ₹{salesReport.totalRevenue.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bills Created:</span>
                    <span className="font-medium">{salesReport.totalBills}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Bill Value:</span>
                    <span className="font-medium">
                      ₹{salesReport.averageBillValue.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unique Customers:</span>
                    <span className="font-medium">
                      {salesReport.uniqueCustomers}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New Customers:</span>
                    <span className="font-medium">
                      {salesReport.customerMetrics.new}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Repeat Customers:</span>
                    <span className="font-medium">
                      {salesReport.customerMetrics.repeat}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Generated:</span>
                    <span className="font-medium text-xs">
                      {new Date().toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
