import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  Send,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  API_ENDPOINTS,
  EBILL_CONFIG,
  type EBillChannel,
  formatCurrency,
} from "@/lib/constants";
import QRCode from "qrcode";

interface Bill {
  id: number;
  bill_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  final_amount: number;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

interface SendEBillDialogProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendEBillDialog({
  bill,
  open,
  onOpenChange,
}: SendEBillDialogProps) {
  const { toast } = useToast();
  const [selectedChannels, setSelectedChannels] = useState<EBillChannel[]>([]);
  const [email, setEmail] = useState(bill?.customer_email || "");
  const [phone, setPhone] = useState(bill?.customer_phone || "");
  const [message, setMessage] = useState("");
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  if (!bill) return null;

  // Generate QR code when dialog opens
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // QR code contains bill verification URL
        const billURL = `${window.location.origin}/verify-bill/${bill.bill_number}`;
        const dataURL = await QRCode.toDataURL(billURL, {
          width: EBILL_CONFIG.QR_SIZE,
          margin: 2,
          errorCorrectionLevel: EBILL_CONFIG.QR_ERROR_CORRECTION,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrDataURL(dataURL);
      } catch (error) {
        console.error("QR Code generation failed:", error);
      }
    };

    if (bill && open) {
      generateQRCode();
      setEmail(bill.customer_email || "");
      setPhone(bill.customer_phone || "");
      setSelectedChannels([]);
      setMessage(
        `Thank you for shopping with us! Your bill #${bill.bill_number} for ${formatCurrency(bill.final_amount)} is attached.`,
      );
    }
  }, [bill, open]);

  const handleChannelToggle = (channel: EBillChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const validateInputs = (): boolean => {
    if (selectedChannels.length === 0) {
      toast({
        variant: "destructive",
        title: "Select Channel",
        description: "Please select at least one delivery channel",
      });
      return false;
    }

    if (selectedChannels.includes("email") && !email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please provide customer email address",
      });
      return false;
    }

    if (
      (selectedChannels.includes("sms") ||
        selectedChannels.includes("whatsapp")) &&
      !phone
    ) {
      toast({
        variant: "destructive",
        title: "Phone Required",
        description: "Please provide customer phone number",
      });
      return false;
    }

    return true;
  };

  const handleSendEBill = async () => {
    if (!validateInputs()) return;

    setIsSending(true);

    try {
      const response = await fetch(API_ENDPOINTS.BILLS.SEND_EBILL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bill_id: bill.id,
          bill_number: bill.bill_number,
          channels: selectedChannels,
          email: selectedChannels.includes("email") ? email : undefined,
          phone:
            selectedChannels.includes("sms") ||
            selectedChannels.includes("whatsapp")
              ? phone
              : undefined,
          message,
          qr_code: qrDataURL,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send e-bill");
      }

      const result = await response.json();

      toast({
        title: "E-Bill Sent Successfully! 📧",
        description: `Sent via ${selectedChannels.join(", ").toUpperCase()}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send E-Bill",
        description: error.message || "Please try again",
      });
    } finally {
      setIsSending(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataURL) return;

    const link = document.createElement("a");
    link.download = `bill-qr-${bill.bill_number}.png`;
    link.href = qrDataURL;
    link.click();

    toast({
      title: "QR Code Downloaded",
      description: "QR code saved to downloads",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send E-Bill to Customer</DialogTitle>
          <DialogDescription>
            Share digital receipt via Email, SMS, or WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">
                  Bill #{bill.bill_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {bill.customer_name || "Walk-in Customer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(bill.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(bill.final_amount)}
                </p>
                <Badge variant="default" className="mt-1">
                  {bill.items.length} items
                </Badge>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          {qrDataURL && (
            <div className="flex flex-col items-center border rounded-lg p-4 bg-white">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Bill Verification QR Code
              </p>
              <img
                src={qrDataURL}
                alt="Bill QR Code"
                className="w-48 h-48 border-2 border-gray-200 rounded"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                className="mt-3"
              >
                Download QR Code
              </Button>
            </div>
          )}

          {/* Delivery Channels */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Select Delivery Channels
            </Label>

            {/* Email Option */}
            <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
              <Checkbox
                id="channel-email"
                checked={selectedChannels.includes("email")}
                onCheckedChange={() => handleChannelToggle("email")}
              />
              <div className="flex-1">
                <label
                  htmlFor="channel-email"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Email</span>
                </label>
                {selectedChannels.includes("email") && (
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* SMS Option */}
            <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
              <Checkbox
                id="channel-sms"
                checked={selectedChannels.includes("sms")}
                onCheckedChange={() => handleChannelToggle("sms")}
              />
              <div className="flex-1">
                <label
                  htmlFor="channel-sms"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <span className="font-medium">SMS</span>
                </label>
                {selectedChannels.includes("sms") && (
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* WhatsApp Option */}
            <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
              <Checkbox
                id="channel-whatsapp"
                checked={selectedChannels.includes("whatsapp")}
                onCheckedChange={() => handleChannelToggle("whatsapp")}
              />
              <div className="flex-1">
                <label
                  htmlFor="channel-whatsapp"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Phone className="h-5 w-5 text-green-600" />
                  <span className="font-medium">WhatsApp</span>
                </label>
                {selectedChannels.includes("whatsapp") && (
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personalized message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedChannels.length > 0 && (
            <div className="border-l-4 border-orange-600 bg-orange-50 dark:bg-orange-950 p-4 rounded">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Includes: PDF bill, QR code, and payment details
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEBill} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send E-Bill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
