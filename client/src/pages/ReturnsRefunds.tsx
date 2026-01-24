import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Receipt,
} from "lucide-react";

interface Bill {
  id: number;
  bill_number: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

interface Return {
  id: number;
  bill_id: number;
  bill_number: string;
  customer_name?: string;
  return_amount: number;
  refund_method: string;
  refund_status: string;
  reason: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    amount: number;
  }>;
}

export default function ReturnsRefunds() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchBillNumber, setSearchBillNumber] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>(
    {},
  );
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "card" | "upi" | "store_credit"
  >("cash");

  // Fetch recent returns
  const { data: returns, isLoading: returnsLoading } = useQuery<Return[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const res = await fetch("/api/returns", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch returns");
      return res.json();
    },
    enabled: !!user?.org_id,
  });

  // Search for bill
  const searchBill = async () => {
    if (!searchBillNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Bill Number Required",
        description: "Please enter a bill number to search",
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/bills/search?bill_number=${searchBillNumber}`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error("Bill not found");
      }

      const bill = await res.json();
      setSelectedBill(bill);

      // Initialize selected items (all with quantity 0)
      const initialSelection: Record<number, number> = {};
      bill.items.forEach((item: any) => {
        initialSelection[item.id] = 0;
      });
      setSelectedItems(initialSelection);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bill Not Found",
        description: error.message || "Could not find bill with that number",
      });
      setSelectedBill(null);
    }
  };

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(returnData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create return");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      toast({
        title: "Return Processed",
        description: "Refund has been initiated successfully",
      });
      setShowReturnDialog(false);
      setSelectedBill(null);
      setSearchBillNumber("");
      setReturnReason("");
      setSelectedItems({});
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleProcessReturn = () => {
    if (!selectedBill) return;

    // Validate return items
    const returnItems = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => {
        const item = selectedBill.items.find((i) => i.id === parseInt(itemId));
        return {
          bill_item_id: parseInt(itemId),
          product_name: item?.product_name || "",
          quantity,
          amount: (item?.unit_price || 0) * quantity,
        };
      });

    if (returnItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Items Selected",
        description: "Please select at least one item to return",
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please provide a reason for the return",
      });
      return;
    }

    const returnAmount = returnItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    createReturnMutation.mutate({
      bill_id: selectedBill.id,
      items: returnItems,
      return_amount: returnAmount,
      refund_method: refundMethod,
      reason: returnReason,
    });
  };

  const updateItemQuantity = (
    itemId: number,
    quantity: number,
    maxQuantity: number,
  ) => {
    const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: validQuantity,
    }));
  };

  const totalReturnAmount = selectedBill
    ? Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
        const item = selectedBill.items.find((i) => i.id === parseInt(itemId));
        return sum + (item?.unit_price || 0) * qty;
      }, 0)
    : 0;

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Returns & Refunds
          </h1>
          <p className="text-muted-foreground mt-1">
            Process returns and manage refunds
          </p>
        </div>
      </div>

      {/* Search Bill Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-orange-600" />
            Search Bill
          </CardTitle>
          <CardDescription>
            Enter bill number to initiate return
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter bill number (e.g., BILL-2024-001)"
                value={searchBillNumber}
                onChange={(e) => setSearchBillNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchBill()}
              />
            </div>
            <Button onClick={searchBill}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Selected Bill Details */}
          {selectedBill && (
            <div className="mt-6 border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    Bill #{selectedBill.bill_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedBill.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(selectedBill.final_amount)}
                  </p>
                </div>
              </div>

              {selectedBill.customer_name && (
                <div className="border-t pt-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Customer:</span>{" "}
                    {selectedBill.customer_name}
                  </p>
                  {selectedBill.customer_phone && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {selectedBill.customer_phone}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Select Items to Return</h4>
                  <Button
                    size="sm"
                    onClick={() => setShowReturnDialog(true)}
                    disabled={totalReturnAmount === 0}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Process Return ({formatCurrency(totalReturnAmount)})
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedBill.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border rounded p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.unit_price)} × {item.quantity} ={" "}
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Return Qty:</Label>
                        <Input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={selectedItems[item.id] || 0}
                          onChange={(e) =>
                            updateItemQuantity(
                              item.id,
                              parseInt(e.target.value) || 0,
                              item.quantity,
                            )
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          / {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Returns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            Recent Returns
          </CardTitle>
          <CardDescription>View and manage return requests</CardDescription>
        </CardHeader>
        <CardContent>
          {returnsLoading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading returns...
            </p>
          ) : returns && returns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="text-sm">
                      {formatDate(returnItem.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {returnItem.bill_number}
                    </TableCell>
                    <TableCell>{returnItem.customer_name || "N/A"}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(returnItem.return_amount)}
                    </TableCell>
                    <TableCell className="uppercase text-sm">
                      {returnItem.refund_method.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(returnItem.refund_status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {returnItem.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No returns found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Confirmation Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>
              Review return details and process refund
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Return Amount:</span>
                <span className="font-bold text-lg text-orange-600">
                  {formatCurrency(totalReturnAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Refund Method</Label>
              <select
                className="w-full border rounded-md p-2"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card Reversal</option>
                <option value="upi">UPI Refund</option>
                <option value="store_credit">Store Credit</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Return Reason *</Label>
              <Textarea
                placeholder="Describe the reason for return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessReturn}
              disabled={createReturnMutation.isPending}
            >
              {createReturnMutation.isPending
                ? "Processing..."
                : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
