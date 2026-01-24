import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  CreditCard,
  Wallet,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SplitPayment {
  id: string;
  method: "cash" | "card" | "upi" | "credit";
  amount: number;
  reference?: string;
}

interface SplitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onComplete: (payments: SplitPayment[]) => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "credit", label: "Credit", icon: DollarSign },
] as const;

export function SplitPaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onComplete,
}: SplitPaymentDialogProps) {
  const [payments, setPayments] = useState<SplitPayment[]>([
    {
      id: crypto.randomUUID(),
      method: "cash",
      amount: totalAmount,
      reference: "",
    },
  ]);
  const { toast } = useToast();

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;
  const isValid = Math.abs(remaining) < 0.01; // Allow for rounding errors

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleAddPayment = () => {
    if (remaining > 0) {
      setPayments([
        ...payments,
        {
          id: crypto.randomUUID(),
          method: "cash",
          amount: remaining,
          reference: "",
        },
      ]);
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Add Payment",
        description: "Total amount already covered",
      });
    }
  };

  const handleRemovePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Remove",
        description: "At least one payment method required",
      });
    }
  };

  const handleUpdatePayment = (
    id: string,
    field: keyof SplitPayment,
    value: any,
  ) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleComplete = () => {
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Split",
        description: `Please ensure total matches bill amount. Remaining: ${formatCurrency(remaining)}`,
      });
      return;
    }

    // Validate each payment
    for (const payment of payments) {
      if (payment.amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: "All payment amounts must be greater than 0",
        });
        return;
      }

      if (
        (payment.method === "card" || payment.method === "upi") &&
        !payment.reference
      ) {
        toast({
          variant: "destructive",
          title: "Reference Required",
          description: `Please provide reference number for ${payment.method.toUpperCase()} payment`,
        });
        return;
      }
    }

    onComplete(payments);
    onOpenChange(false);
  };

  const handleQuickSplit = (ratio: number[]) => {
    const numPayments = ratio.length;
    const total = ratio.reduce((sum, r) => sum + r, 0);

    const newPayments: SplitPayment[] = ratio.map((r, index) => ({
      id: crypto.randomUUID(),
      method: index === 0 ? "cash" : "card",
      amount: parseFloat(((totalAmount * r) / total).toFixed(2)),
      reference: "",
    }));

    // Adjust last payment for rounding errors
    const calculatedTotal = newPayments.reduce((sum, p) => sum + p.amount, 0);
    const diff = totalAmount - calculatedTotal;
    if (Math.abs(diff) > 0) {
      newPayments[newPayments.length - 1].amount += diff;
    }

    setPayments(newPayments);
  };

  const getPaymentIcon = (method: SplitPayment["method"]) => {
    const config = PAYMENT_METHODS.find((m) => m.value === method);
    const Icon = config?.icon || Wallet;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
          <DialogDescription>
            Divide the payment across multiple methods
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bill Amount:</span>
            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid:</span>
            <span
              className={
                totalPaid > totalAmount
                  ? "text-red-600 font-semibold"
                  : "font-semibold"
              }
            >
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground font-medium">
              Remaining:
            </span>
            <Badge
              variant={
                isValid
                  ? "default"
                  : remaining > 0
                    ? "destructive"
                    : "secondary"
              }
              className="font-mono"
            >
              {formatCurrency(remaining)}
            </Badge>
          </div>
        </div>

        {/* Quick Split Options */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Split</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSplit([1, 1])}
            >
              50/50
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSplit([2, 1])}
            >
              66/33
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSplit([3, 1])}
            >
              75/25
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSplit([1, 1, 1])}
            >
              3-Way
            </Button>
          </div>
        </div>

        {/* Payment List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Payment Methods ({payments.length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPayment}
              disabled={remaining <= 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Payment
            </Button>
          </div>

          {payments.map((payment, index) => (
            <div
              key={payment.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPaymentIcon(payment.method)}
                  <span className="font-medium text-sm">
                    Payment {index + 1}
                  </span>
                </div>
                {payments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePayment(payment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`method-${payment.id}`}>Method</Label>
                  <Select
                    value={payment.method}
                    onValueChange={(value) =>
                      handleUpdatePayment(payment.id, "method", value)
                    }
                  >
                    <SelectTrigger id={`method-${payment.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        return (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {method.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`amount-${payment.id}`}>Amount</Label>
                  <Input
                    id={`amount-${payment.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={payment.amount}
                    onChange={(e) =>
                      handleUpdatePayment(
                        payment.id,
                        "amount",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              {(payment.method === "card" || payment.method === "upi") && (
                <div className="space-y-2">
                  <Label htmlFor={`ref-${payment.id}`}>
                    Reference Number{" "}
                    {payment.method === "card" && "(Last 4 digits)"}
                  </Label>
                  <Input
                    id={`ref-${payment.id}`}
                    placeholder={
                      payment.method === "card" ? "1234" : "UPI Transaction ID"
                    }
                    value={payment.reference || ""}
                    onChange={(e) =>
                      handleUpdatePayment(
                        payment.id,
                        "reference",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!isValid}>
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
