import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { offlineQueueManager } from "@/lib/offlineQueue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FastForward,
  IndianRupee,
  Receipt,
  TrendingUp,
  Clock,
  User,
  Package,
  AlertCircle,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface POSMetrics {
  todaySales: number;
  todayBills: number;
  averageBillValue: number;
  currentShift?: {
    id: string;
    shift_start: string;
    opening_cash: number;
    total_sales: number;
    total_bills: number;
  };
  last7DaysSales: Array<{
    date: string;
    revenue: number;
    billCount: number;
  }>;
  topSellingToday: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  hourlyPeaks: Array<{
    hour: number;
    billCount: number;
    revenue: number;
  }>;
}

/**
 * POS Dashboard - Real-time cashier metrics
 *
 * Features:
 * - Today's sales summary
 * - Current shift tracking
 * - Offline queue status
 * - Quick actions
 * - Top selling products
 * - Payment method breakdown
 * - Hourly sales trends
 */
export default function POSDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    syncing: 0,
    failed: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch offline queue stats
  useEffect(() => {
    const fetchQueueStats = async () => {
      const stats = await offlineQueueManager.getQueueStats();
      setQueueStats(stats);
    };
    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch today's metrics
  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery<POSMetrics>({
    queryKey: ["pos-metrics"],
    queryFn: async () => {
      const response = await api.get("/pos/metrics");
      return response;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shiftDuration = metrics?.currentShift
    ? Math.floor(
        (new Date().getTime() -
          new Date(metrics.currentShift.shift_start).getTime()) /
          (1000 * 60),
      )
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FastForward className="h-8 w-8 text-orange-600" />
            POS Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time sales and cashier metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-gray-500">Current Time</div>
            <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => navigate("/quick-pos")}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <FastForward className="h-4 w-4 mr-2" />
            Open POS
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Today's Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {isLoading ? "..." : formatCurrency(metrics?.todaySales || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics?.todayBills || 0} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Avg Bill Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading
                ? "..."
                : formatCurrency(metrics?.averageBillValue || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Current Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.currentShift ? `${shiftDuration}m` : "No Shift"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics?.currentShift
                ? `${formatCurrency(metrics.currentShift.total_sales)} sales`
                : "Start a shift"}
            </p>
          </CardContent>
        </Card>

        <Card className={cn(queueStats.pending > 0 && "border-yellow-500")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Offline Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {queueStats.pending + queueStats.syncing}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {queueStats.failed > 0 && (
                <span className="text-red-500">{queueStats.failed} failed</span>
              )}
              {queueStats.failed === 0 && "All synced"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Selling Today
            </CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : metrics?.topSellingToday &&
              metrics.topSellingToday.length > 0 ? (
              <div className="space-y-3">
                {metrics.topSellingToday.slice(0, 5).map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.quantity} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sales yet today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Today's breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : metrics?.paymentMethodBreakdown &&
              metrics.paymentMethodBreakdown.length > 0 ? (
              <div className="space-y-3">
                {metrics.paymentMethodBreakdown.map((method, index) => {
                  const total = metrics.paymentMethodBreakdown.reduce(
                    (sum, m) => sum + m.amount,
                    0,
                  );
                  const percentage =
                    total > 0 ? (method.amount / total) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {method.method}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {method.count} bills
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(method.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No payments yet today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common POS operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-20"
              onClick={() => navigate("/quick-pos")}
            >
              <div className="text-center">
                <FastForward className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">New Sale</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => navigate("/billing")}
            >
              <div className="text-center">
                <Receipt className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">View Bills</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => navigate("/customers")}
            >
              <div className="text-center">
                <User className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Customers</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => navigate("/inventory")}
            >
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Inventory</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
