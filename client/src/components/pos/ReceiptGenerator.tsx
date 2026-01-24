import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bill {
  id: number;
  bill_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax?: number;
    subtotal: number;
  }>;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_gstin?: string;
}

interface ReceiptGeneratorProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName?: string;
}

export function ReceiptGenerator({
  bill,
  open,
  onOpenChange,
  orgName = "PantryPal",
}: ReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!bill) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Generate thermal printer ESC/POS commands
  const generateThermalReceipt = () => {
    const ESC = "\x1b";
    const GS = "\x1d";

    let receipt = "";

    // Initialize printer
    receipt += ESC + "@";

    // Center align + bold + double height for header
    receipt += ESC + "a" + "\x01"; // Center
    receipt += ESC + "!" + "\x30"; // Bold + Double height
    receipt += `${bill.store_name || orgName}\n`;

    // Reset formatting
    receipt += ESC + "!" + "\x00";

    // Store details
    if (bill.store_address) {
      receipt += ESC + "a" + "\x01"; // Center
      receipt += `${bill.store_address}\n`;
    }
    if (bill.store_phone) {
      receipt += `Tel: ${bill.store_phone}\n`;
    }
    if (bill.store_gstin) {
      receipt += `GSTIN: ${bill.store_gstin}\n`;
    }

    // Separator line
    receipt += ESC + "a" + "\x00"; // Left align
    receipt += "----------------------------------------\n";

    // Bill details
    receipt += `Bill No: ${bill.bill_number}\n`;
    receipt += `Date: ${formatDate(bill.created_at)}\n`;

    if (bill.customer_name) {
      receipt += `Customer: ${bill.customer_name}\n`;
    }
    if (bill.customer_phone) {
      receipt += `Phone: ${bill.customer_phone}\n`;
    }

    receipt += "----------------------------------------\n";

    // Items header
    receipt += ESC + "!" + "\x08"; // Bold
    receipt += "Item                Qty    Price  Total\n";
    receipt += ESC + "!" + "\x00"; // Normal
    receipt += "----------------------------------------\n";

    // Items
    bill.items.forEach((item) => {
      const name = item.product_name.substring(0, 18).padEnd(18);
      const qty = item.quantity.toString().padStart(3);
      const price = item.unit_price.toFixed(0).padStart(6);
      const total = item.subtotal.toFixed(0).padStart(7);
      receipt += `${name} ${qty} ${price} ${total}\n`;
    });

    receipt += "----------------------------------------\n";

    // Totals
    receipt += `Subtotal:${" ".repeat(25)}${formatCurrency(bill.total_amount)}\n`;

    if (bill.discount_amount > 0) {
      receipt += `Discount:${" ".repeat(25)}${formatCurrency(bill.discount_amount)}\n`;
    }

    if (bill.tax_amount > 0) {
      receipt += `Tax/GST:${" ".repeat(26)}${formatCurrency(bill.tax_amount)}\n`;
    }

    receipt += "----------------------------------------\n";

    // Grand total - bold and larger
    receipt += ESC + "!" + "\x18"; // Bold + Double width
    receipt += `TOTAL:${" ".repeat(20)}${formatCurrency(bill.final_amount)}\n`;
    receipt += ESC + "!" + "\x00"; // Reset

    receipt += "----------------------------------------\n";

    // Payment details
    receipt += `Payment: ${bill.payment_method.toUpperCase()}\n`;
    receipt += `Status: ${bill.payment_status.toUpperCase()}\n`;

    receipt += "----------------------------------------\n";

    // Footer
    receipt += ESC + "a" + "\x01"; // Center
    receipt += "Thank you for shopping with us!\n";
    receipt += "Visit again soon!\n\n";

    // QR Code (if supported) - contains bill number
    receipt += GS + "k" + "\x02"; // QR code
    receipt += bill.bill_number + "\x00";
    receipt += "\n\n";

    // Cut paper
    receipt += GS + "V" + "\x00";

    return receipt;
  };

  const handlePrint = () => {
    // For web browsers - use window.print()
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${bill.bill_number}</title>
              <style>
                @media print {
                  @page { margin: 0; size: 80mm auto; }
                  body { margin: 10mm; }
                }
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  width: 80mm;
                }
                .receipt-container {
                  width: 100%;
                }
                .text-center { text-align: center; }
                .text-bold { font-weight: bold; }
                .text-large { font-size: 16px; }
                .separator { 
                  border-top: 1px dashed #000; 
                  margin: 5px 0;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                td { padding: 2px 0; }
                .text-right { text-align: right; }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }

    toast({
      title: "Printing Receipt",
      description: "Receipt sent to printer",
    });
  };

  const handleThermalPrint = async () => {
    try {
      const thermalData = generateThermalReceipt();

      // For actual thermal printer integration, use:
      // 1. USB/Serial via Web Serial API
      // 2. Network printer via WebSocket
      // 3. Bluetooth via Web Bluetooth API

      // For now, download as .txt file that can be sent to thermal printer
      const blob = new Blob([thermalData], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thermal-receipt-${bill.bill_number}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Thermal Receipt Generated",
        description: "Download the file and send to thermal printer",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate thermal receipt",
      });
    }
  };

  const handleDownloadPDF = async () => {
    // For PDF generation, you can use jsPDF or react-pdf
    // For now, we'll print to PDF using browser's print dialog
    toast({
      title: "PDF Download",
      description: "Use Print button and select 'Save as PDF'",
    });
    handlePrint();
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;

    const receiptText = `
${bill.store_name || orgName}
${bill.store_address || ""}
${bill.store_phone ? `Tel: ${bill.store_phone}` : ""}
${bill.store_gstin ? `GSTIN: ${bill.store_gstin}` : ""}

Bill #: ${bill.bill_number}
Date: ${formatDate(bill.created_at)}
${bill.customer_name ? `Customer: ${bill.customer_name}` : ""}
${bill.customer_phone ? `Phone: ${bill.customer_phone}` : ""}

Items:
${bill.items
  .map(
    (item) =>
      `${item.product_name}\n  ${item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.subtotal)}`,
  )
  .join("\n")}

Subtotal: ${formatCurrency(bill.total_amount)}
${bill.discount_amount > 0 ? `Discount: ${formatCurrency(bill.discount_amount)}\n` : ""}
${bill.tax_amount > 0 ? `Tax: ${formatCurrency(bill.tax_amount)}\n` : ""}
Total: ${formatCurrency(bill.final_amount)}

Payment: ${bill.payment_method}
Status: ${bill.payment_status}

Thank you for shopping with us!
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${bill.bill_number}`,
          text: receiptText,
        });
        toast({
          title: "Receipt Shared",
          description: "Receipt shared successfully",
        });
      } catch (error) {
        // User cancelled share or share failed
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(receiptText);
      toast({
        title: "Copied to Clipboard",
        description: "Receipt copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt - {bill.bill_number}</DialogTitle>
          <DialogDescription>
            Print, download, or share this receipt
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Preview */}
        <div
          ref={receiptRef}
          className="receipt-container border rounded-lg p-4 bg-white text-black font-mono text-sm"
        >
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">{bill.store_name || orgName}</h2>
            {bill.store_address && (
              <p className="text-xs mt-1">{bill.store_address}</p>
            )}
            {bill.store_phone && (
              <p className="text-xs">Tel: {bill.store_phone}</p>
            )}
            {bill.store_gstin && (
              <p className="text-xs">GSTIN: {bill.store_gstin}</p>
            )}
          </div>

          <div className="separator"></div>

          {/* Bill Info */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span>Bill No:</span>
              <span className="font-bold">{bill.bill_number}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Date:</span>
              <span>{formatDate(bill.created_at)}</span>
            </div>
            {bill.customer_name && (
              <div className="flex justify-between text-xs">
                <span>Customer:</span>
                <span>{bill.customer_name}</span>
              </div>
            )}
            {bill.customer_phone && (
              <div className="flex justify-between text-xs">
                <span>Phone:</span>
                <span>{bill.customer_phone}</span>
              </div>
            )}
          </div>

          <div className="separator"></div>

          {/* Items */}
          <table className="w-full mb-3 text-xs">
            <thead>
              <tr className="font-bold">
                <td>Item</td>
                <td className="text-right">Qty</td>
                <td className="text-right">Price</td>
                <td className="text-right">Total</td>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, index) => (
                <tr key={index}>
                  <td className="pr-2">{item.product_name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="text-right">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="separator"></div>

          {/* Totals */}
          <div className="space-y-1 mb-3 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(bill.total_amount)}</span>
            </div>
            {bill.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>- {formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            {bill.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Tax/GST:</span>
                <span>{formatCurrency(bill.tax_amount)}</span>
              </div>
            )}
            <div className="separator"></div>
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span>
              <span>{formatCurrency(bill.final_amount)}</span>
            </div>
          </div>

          <div className="separator"></div>

          {/* Payment Info */}
          <div className="space-y-1 mb-3 text-xs">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="uppercase">{bill.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="uppercase font-bold">{bill.payment_status}</span>
            </div>
          </div>

          <div className="separator"></div>

          {/* Footer */}
          <div className="text-center text-xs mt-4">
            <p className="font-bold">Thank you for shopping with us!</p>
            <p className="mt-1">Visit again soon!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Print (A4)
            </Button>
            <Button
              onClick={handleThermalPrint}
              variant="outline"
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Thermal
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handleShare} variant="outline" className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
