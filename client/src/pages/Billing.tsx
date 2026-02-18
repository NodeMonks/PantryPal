import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PageLoadingSkeleton,
  TableSkeleton,
} from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBillStore } from "@/stores/billStore";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Bill, type BillItem } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Receipt,
  IndianRupee,
  Eye,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/lib/pdfGenerator";
import { ThermalPrinter } from "@/lib/thermalPrinter";

export default function Billing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const billStore = useBillStore();
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.org_id) {
      billStore.loadBills(user.org_id);
    }
  }, [user?.org_id, billStore]);

  useEffect(() => {
    const filtered = billStore.bills.filter(
      (bill: Bill) =>
        bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.customer_id &&
          bill.customer_id.toLowerCase().includes(searchTerm.toLowerCase())),
    );
    setFilteredBills(filtered);
  }, [billStore.bills, searchTerm]);

  const handleViewBill = async (bill: Bill) => {
    setSelectedBill(bill);
    setViewOpen(true);
    setItems([]);
    try {
      setItemsLoading(true);
      const data = await api.getBillItems(bill.id);
      setItems(data);
    } catch (error) {
      console.error("Error loading bill items:", error);
      toast({
        title: "Error",
        description: "Failed to load bill items",
        variant: "destructive",
      });
    } finally {
      setItemsLoading(false);
    }
  };

  const handlePrintPDF = () => {
    if (!selectedBill || items.length === 0) return;

    generateInvoicePDF({
      billNumber: selectedBill.bill_number,
      date: new Date(selectedBill.created_at),
      items: items.map((i) => ({
        id: i.id,
        name: i.product_name || "Unknown Product",
        quantity: i.quantity,
        price: Number(i.unit_price),
        total: Number(i.total_price),
      })),
      subtotal: Number(selectedBill.total_amount),
      tax: Number(selectedBill.tax_amount),
      total: Number(selectedBill.final_amount),
      organizationName: "PantryPal",
    });

    toast({
      title: "Invoice Generated",
      description: "Your PDF invoice is ready for download.",
    });
  };

  const handlePrintThermal = async () => {
    if (!selectedBill || items.length === 0) return;

    try {
      await ThermalPrinter.printReceipt({
        organizationName: "PantryPal",
        billNumber: selectedBill.bill_number,
        date: new Date(selectedBill.created_at),
        items: items.map((i) => ({
          name: (i.product_name || "Product").substring(0, 20),
          quantity: i.quantity,
          price: Number(i.unit_price),
          total: Number(i.total_price),
        })),
        total: Number(selectedBill.final_amount),
      });

      toast({
        title: "Printing Started",
        description: "The receipt has been sent to the thermal printer.",
      });
    } catch (error: any) {
      toast({
        title: "Printing Failed",
        description: error.message || "Could not connect to the printer.",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethodBadge = (method: string | null) => {
    switch (method) {
      case "cash":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
            💵 Cash
          </Badge>
        );
      case "card":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100">
            💳 Card
          </Badge>
        );
      case "upi":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-100">
            📱 UPI
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
            💵 Cash
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (billStore.loading) {
    return (
      <PageLoadingSkeleton
        statCols={4}
        tableRows={7}
        tableCols={5}
        showAction
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("billing.title")}
          </h1>
          <p className="text-muted-foreground">{t("billing.subtitle")}</p>
        </div>
        <Button
          asChild
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 h-11"
        >
          <Link to="/billing/new">
            <Plus className="h-4 w-4" />
            {t("billing.newBill")}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Bills */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Receipt className="h-4 w-4 text-white" />
              </div>
              {t("billing.totalBills")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {billStore.bills.length}
            </div>
            <p className="text-xs text-blue-200 mt-1">{t("billing.allTime")}</p>
          </CardContent>
        </Card>

        {/* Today's Sales */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <FileText className="h-4 w-4 text-white" />
              </div>
              {t("billing.todaySales")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {
                billStore.bills.filter((bill: Bill) => {
                  const billDate = new Date(bill.created_at).toDateString();
                  const today = new Date().toDateString();
                  return billDate === today;
                }).length
              }
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              {t("billing.billsToday")}
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
              ₹
              {billStore.bills
                .reduce(
                  (sum: number, bill: Bill) => sum + Number(bill.final_amount),
                  0,
                )
                .toLocaleString()}
            </div>
            <p className="text-xs text-violet-200 mt-1">
              {t("billing.lifetimeRevenue")}
            </p>
          </CardContent>
        </Card>

        {/* Average Bill */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Download className="h-4 w-4 text-white" />
              </div>
              {t("billing.averageBill")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              ₹
              {billStore.bills.length > 0
                ? Math.round(
                    billStore.bills.reduce(
                      (sum: number, bill: Bill) =>
                        sum + Number(bill.final_amount),
                      0,
                    ) / billStore.bills.length,
                  )
                : 0}
            </div>
            <p className="text-xs text-amber-100 mt-1">
              {t("billing.perTransaction")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border border-border/50 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("billing.searchPlaceholder")}
              className="pl-10 h-11 bg-muted/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t("billing.recentBills")}
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredBills.length} of {billStore.bills.length} bills
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? t("billing.noBillsSearch") : t("billing.noBills")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">
                      {t("billing.billNumber")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("billing.dateTime")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("common.amount")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("billing.paymentMethod")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill, idx) => (
                    <TableRow
                      key={bill.id}
                      className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <TableCell>
                        <div className="font-semibold text-blue-700 dark:text-blue-400">
                          {bill.bill_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(bill.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            ₹{Number(bill.final_amount).toLocaleString()}
                          </span>
                          {Number(bill.discount_amount) > 0 && (
                            <span className="text-xs text-orange-600">
                              -{t("billing.discount")}: ₹
                              {Number(bill.discount_amount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(bill.payment_method)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 gap-1"
                          onClick={() => handleViewBill(bill)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("common.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Bill Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("billing.billDetails")}</DialogTitle>
            <DialogDescription>
              {selectedBill ? (
                <div className="mt-2 space-y-1">
                  <div className="text-sm">
                    Bill No:{" "}
                    <span className="font-medium">
                      {selectedBill.bill_number}
                    </span>
                  </div>
                  <div className="text-sm">
                    Date:{" "}
                    {new Date(selectedBill.created_at).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm">
                    Payment:{" "}
                    {selectedBill.payment_method?.toUpperCase() || "CASH"}
                  </div>
                  <div className="text-sm">
                    Amount: ₹
                    {Number(selectedBill.final_amount).toLocaleString()}
                  </div>
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {itemsLoading ? (
              <TableSkeleton
                rows={4}
                headers={["Product", "Qty", "Unit Price", "Total"]}
              />
            ) : items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("billing.noItems")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("billing.product")}</TableHead>
                      <TableHead>{t("billing.qty")}</TableHead>
                      <TableHead>{t("billing.unitPrice")}</TableHead>
                      <TableHead>{t("common.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          {i.product_name || `${i.product_id.slice(0, 8)}…`}
                        </TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>
                          ₹{Number(i.unit_price).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ₹{Number(i.total_price).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handlePrintThermal}
              disabled={itemsLoading || items.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t("billing.thermalPrint")}
            </Button>
            <Button
              variant="default"
              className="w-full sm:w-auto"
              onClick={handlePrintPDF}
              disabled={itemsLoading || items.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("billing.professionalPdf")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
