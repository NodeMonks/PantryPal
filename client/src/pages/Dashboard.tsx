import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useProductStore } from "@/stores/productStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useBillStore } from "@/stores/billStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAuth } from "@/contexts/AuthContext";
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
  AlertCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const productStore = useProductStore();
  const customerStore = useCustomerStore();
  const billStore = useBillStore();
  const inventoryStore = useInventoryStore();

  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  // Load all store data
  useEffect(() => {
    if (user?.org_id) {
      productStore.loadProducts(user.org_id);
      customerStore.loadCustomers(user.org_id);
      billStore.loadBills(user.org_id);
      inventoryStore.loadInventoryAlerts(user.org_id);
    }
  }, [user?.org_id]);

  // Generate sales data for the last 7 days
  useEffect(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });

      const dayBills = billStore.bills.filter((bill) => {
        const billDate = new Date(bill.created_at).toDateString();
        return billDate === date.toDateString();
      });

      const revenue = dayBills.reduce(
        (sum, bill) => sum + Number(bill.final_amount),
        0
      );

      data.push({
        date: dateStr,
        revenue: Math.round(revenue),
        count: dayBills.length,
      });
    }
    setSalesData(data);
  }, [billStore.bills]);

  // Generate category distribution
  useEffect(() => {
    const categoryMap = new Map<string, number>();
    productStore.products.forEach((product) => {
      const count = categoryMap.get(product.category) || 0;
      categoryMap.set(product.category, count + 1);
    });

    const data = Array.from(categoryMap).map(([category, count]) => ({
      name: category,
      value: count,
    }));
    setCategoryData(data);
  }, [productStore.products]);

  // Calculate metrics
  const totalProducts = productStore.products.length;
  const lowStockCount = productStore.products.filter(
    (p) => (p.quantity_in_stock || 0) <= (p.min_stock_level || 0)
  ).length;

  const todayBills = billStore.bills.filter((bill) => {
    const billDate = new Date(bill.created_at).toDateString();
    const today = new Date().toDateString();
    return billDate === today;
  });

  const todaySales = todayBills.reduce(
    (sum, bill) => sum + Number(bill.final_amount),
    0
  );

  const totalRevenue = billStore.bills.reduce(
    (sum, bill) => sum + Number(bill.final_amount),
    0
  );

  // Collect all batches from products
  const allBatches = productStore.products.flatMap((product) =>
    (product.batches || []).map(
      (batch: NonNullable<typeof product.batches>[number]) => ({
        ...batch,
        productName: product.name,
        productId: product.id,
      })
    )
  );

  // Batches expiring soon (within 7 days)
  const expiringBatches = allBatches.filter((batch) => {
    if (!batch.expiry_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(batch.expiry_date).getTime() - new Date().getTime()) /
        (1000 * 3600 * 24)
    );
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  });

  const totalCustomers = customerStore.customers.length;

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  if (productStore.loading || customerStore.loading || billStore.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your PantryPal dashboard
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Need restock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Today Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{Math.round(todaySales).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayBills.length} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{Math.round(totalRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {billStore.bills.length} bills
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
            <div className="text-2xl font-bold text-purple-600">
              {totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `₹${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #666",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expiring Batches & Shelf Placement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Expiring Batches & Shelf Placement
            </CardTitle>
            <CardDescription>
              Batches expiring within 7 days, sorted for front shelf placement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringBatches.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                No batches expiring soon
              </div>
            ) : (
              <div className="space-y-2">
                {expiringBatches
                  .sort((a, b) => {
                    const aTime = a.expiry_date
                      ? new Date(a.expiry_date).getTime()
                      : Number.POSITIVE_INFINITY;
                    const bTime = b.expiry_date
                      ? new Date(b.expiry_date).getTime()
                      : Number.POSITIVE_INFINITY;
                    return aTime - bTime;
                  })
                  .slice(0, 5)
                  .map((batch) => {
                    const daysLeft = Math.ceil(
                      (new Date(batch.expiry_date || "").getTime() -
                        new Date().getTime()) /
                        (1000 * 3600 * 24)
                    );
                    return (
                      <div
                        key={
                          batch.batch_id ||
                          batch.batch_number ||
                          `${batch.productId}-${batch.expiry_date || "na"}`
                        }
                        className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm border-b pb-2 mb-2"
                      >
                        <span className="font-medium text-foreground">
                          {batch.productName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Batch: {batch.batch_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Shelf: {batch.shelf_location || "N/A"}
                        </span>
                        <Badge
                          variant={daysLeft <= 3 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {daysLeft} days
                        </Badge>
                      </div>
                    );
                  })}
                {expiringBatches.length > 5 && (
                  <Button variant="link" size="sm" asChild className="w-full">
                    <Link to="/inventory">
                      View all ({expiringBatches.length})
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Quick Actions
            </CardTitle>
            <CardDescription>Fast access to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link to="/inventory/add">+ Add Product</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/billing/new">+ Create Bill</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/customers">+ Add Customer</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/reports">📊 View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} Products Low on Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-4">
              The following products are below their minimum stock level:
            </p>
            <Button asChild>
              <Link to="/inventory">Review Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
