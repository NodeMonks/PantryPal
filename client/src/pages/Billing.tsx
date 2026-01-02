import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          bill.customer_id.toLowerCase().includes(searchTerm.toLowerCase()))
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
        return <Badge variant="secondary">Cash</Badge>;
      case "card":
        return <Badge variant="default">Card</Badge>;
      case "upi":
        return <Badge variant="outline">UPI</Badge>;
      default:
        return <Badge variant="secondary">Cash</Badge>;
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground">Manage your sales and bills</p>
          </div>
        </div>
        <div className="text-center py-8">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Manage your sales and bills</p>
        </div>
        <Button asChild>
          <Link to="/billing/new">
            <Plus className="h-4 w-4 mr-2" />
            New Bill
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billStore.bills.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                billStore.bills.filter((bill: Bill) => {
                  const billDate = new Date(bill.created_at).toDateString();
                  const today = new Date().toDateString();
                  return billDate === today;
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹
              {billStore.bills
                .reduce(
                  (sum: number, bill: Bill) => sum + Number(bill.final_amount),
                  0
                )
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹
              {billStore.bills.length > 0
                ? Math.round(
                    billStore.bills.reduce(
                      (sum: number, bill: Bill) =>
                        sum + Number(bill.final_amount),
                      0
                    ) / billStore.bills.length
                  )
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by bill number or customer..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
          <CardDescription>
            {filteredBills.length} of {billStore.bills.length} bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No bills found matching your search."
                : "No bills generated yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="font-medium">{bill.bill_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(bill.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            ₹{Number(bill.final_amount).toLocaleString()}
                          </span>
                          {Number(bill.discount_amount) > 0 && (
                            <span className="text-xs text-green-600">
                              Discount: ₹
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
                          onClick={() => handleViewBill(bill)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
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
            <DialogTitle>Bill Details</DialogTitle>
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
              <div className="text-center py-6">Loading items…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No items found for this bill.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
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
              Thermal Print
            </Button>
            <Button
              variant="default"
              className="w-full sm:w-auto"
              onClick={handlePrintPDF}
              disabled={itemsLoading || items.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Professional PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
