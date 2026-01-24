import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { offlineQueueManager } from "@/lib/offlineQueue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Trash2,
  Save,
  CreditCard,
  Wifi,
  WifiOff,
  Calculator,
  User,
  Search,
  Pause,
  FastForward,
  X,
  Receipt as ReceiptIcon,
  Split,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ReceiptGenerator } from "@/components/pos/ReceiptGenerator";
import { SplitPaymentDialog } from "@/components/pos/SplitPaymentDialog";

interface CartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    barcode?: string;
    mrp: number;
    quantity_in_stock: number;
  };
  quantity: number;
  unit_price: number;
  discount_percent: number;
  subtotal: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Quick POS - Lightning-fast checkout interface
 *
 * Features:
 * - Single-screen workflow (no page navigation during sale)
 * - Keyboard shortcuts (F1-F12 for common actions)
 * - Auto-focus search after each scan
 * - Offline queue with auto-sync
 * - Hold bills for multi-customer scenarios
 * - Split payment support
 * - Touch-optimized for tablets
 * - Sub-30 second checkout goal
 */
export default function QuickPOS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart state (local, not persisted)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">(
    "cash",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Receipt and split payment dialogs
  const [receiptBill, setReceiptBill] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "✓ Back Online",
        description: "Syncing pending bills...",
      });
      offlineQueueManager.processPendingBills();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "⚠ Offline Mode",
        description: "Bills will sync when connection restored",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Focus search
      if (e.key === "F1") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // F2 - Complete sale
      if (e.key === "F2" && cartItems.length > 0) {
        e.preventDefault();
        handleCompleteSale();
      }
      // F3 - Hold bill
      if (e.key === "F3" && cartItems.length > 0) {
        e.preventDefault();
        handleHoldBill();
      }
      // F4 - Clear cart
      if (e.key === "F4") {
        e.preventDefault();
        handleClearCart();
      }
      // Escape - Clear search
      if (e.key === "Escape") {
        setSearchTerm("");
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems]);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await api.get("/customers");
      return response || [];
    },
  });

  // Search products
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["product-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const response = await api.get(
        `/products?q=${encodeURIComponent(searchTerm)}`,
      );
      return response || [];
    },
    enabled: searchTerm.length >= 2,
  });

  /**
   * Handle barcode scanner input (Enter key detection)
   */
  const handleBarcodeSearch = async (code: string) => {
    if (!code.trim()) return;

    try {
      // Try exact barcode/QR code match first
      const product = await api.searchProductByCode(code);
      addToCart(product);
    } catch (error) {
      // If exact match fails, show toast
      toast({
        title: "No exact match",
        description: "Showing search results instead",
      });
    }
  };

  /**
   * Handle Enter key in search (barcode scanner support)
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      e.preventDefault();

      // If search results exist, add first result
      if (searchResults.length > 0) {
        addToCart(searchResults[0]);
      } else {
        // Try barcode search for exact match
        handleBarcodeSearch(searchTerm);
      }
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = (subtotal * discountPercent) / 100;
  const subtotalAfterDiscount = subtotal - discount;
  const tax = (subtotalAfterDiscount * taxPercent) / 100;
  const total = subtotalAfterDiscount + tax;

  /**
   * Add product to cart
   */
  const addToCart = (product: any) => {
    const existingItem = cartItems.find(
      (item) => item.product_id === product.id,
    );

    if (existingItem) {
      // Increment quantity
      setCartItems(
        cartItems.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal:
                  (item.quantity + 1) *
                  item.unit_price *
                  (1 - item.discount_percent / 100),
              }
            : item,
        ),
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        product_id: product.id,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          mrp: parseFloat(product.mrp),
          quantity_in_stock: product.quantity_in_stock || 0,
        },
        quantity: 1,
        unit_price: parseFloat(product.mrp),
        discount_percent: 0,
        subtotal: parseFloat(product.mrp),
      };
      setCartItems([...cartItems, newItem]);
    }

    // Clear search and refocus
    setSearchTerm("");
    searchRef.current?.focus();

    toast({
      title: "Added to cart",
      description: product.name,
      duration: 1500,
    });
  };

  /**
   * Update quantity
   */
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal:
                newQuantity *
                item.unit_price *
                (1 - item.discount_percent / 100),
            }
          : item,
      ),
    );
  };

  /**
   * Remove from cart
   */
  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.product_id !== productId));
  };

  /**
   * Clear cart
   */
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (confirm("Clear all items from cart?")) {
      setCartItems([]);
      setDiscountPercent(0);
      setSelectedCustomer("");
      searchRef.current?.focus();
    }
  };

  /**
   * Hold bill (save for later)
   */
  const handleHoldBill = async () => {
    if (cartItems.length === 0) return;

    const holdName = prompt("Enter a name for this held bill:");
    if (!holdName) return;

    try {
      await api.post("/held-bills", {
        hold_name: holdName,
        customer_id: selectedCustomer || null,
        items: cartItems,
        subtotal,
        discount_percent: discountPercent,
        tax_percent: taxPercent,
      });

      toast({
        title: "✓ Bill Held",
        description: `"${holdName}" saved for later`,
      });

      // Clear cart
      setCartItems([]);
      setDiscountPercent(0);
      setSelectedCustomer("");
      searchRef.current?.focus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to hold bill",
        variant: "destructive",
      });
    }
  };

  /**
   * Complete sale (create bill)
   */
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to cart first",
        variant: "destructive",
      });
      return;
    }

    // Validate customer selection
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const billData = {
        customer_id: selectedCustomer,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
        })),
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        payment_method: paymentMethod,
        subtotal,
        tax,
        total,
      };

      // If offline, queue the bill
      if (!isOnline) {
        await offlineQueueManager.addBillToQueue(billData);
        toast({
          title: "✓ Bill Queued",
          description: "Will sync when online",
        });
      } else {
        // Online: create bill immediately
        const response = await api.post("/bills", billData);

        toast({
          title: "✓ Sale Complete",
          description: `Bill #${response.bill_number} - ₹${total.toFixed(2)}`,
        });
      }

      // Clear cart and reset
      setCartItems([]);
      setDiscountPercent(0);
      setTaxPercent(5);
      setSelectedCustomer("");
      setPaymentMethod("cash");
      searchRef.current?.focus();
    } catch (error: any) {
      // If online request fails, try queuing
      if (isOnline) {
        try {
          const billData = {
            customer_id: selectedCustomer,
            items: cartItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
            })),
            discount_percent: discountPercent,
            tax_percent: taxPercent,
            payment_method: paymentMethod,
            subtotal,
            tax,
            total,
          };
          await offlineQueueManager.addBillToQueue(billData);
          toast({
            title: "⚠ Queued for Sync",
            description: "Bill saved, will sync when possible",
          });
          // Clear cart even if queued
          setCartItems([]);
          setDiscountPercent(0);
          setSelectedCustomer("");
        } catch (queueError) {
          toast({
            title: "Error",
            description: error.message || "Failed to complete sale",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to complete sale",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-900 border-b shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FastForward className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold">Quick POS</h1>
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="ml-2"
            >
              {isOnline ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              F1: Search | F2: Complete | F3: Hold | F4: Clear
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/billing")}
            >
              View Bills
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {/* Left: Product Search & Results */}
        <div className="col-span-2 border-r bg-white dark:bg-gray-900 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={searchRef}
                type="text"
                placeholder="Search products by name, barcode, or scan with scanner (press Enter)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-10 text-lg h-14"
                autoFocus
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching ? (
              <div className="text-center py-8 text-gray-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {searchResults.map((product: any) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      {product.barcode && (
                        <p className="text-xs text-gray-500 mb-2">
                          {product.barcode}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-600">
                          ₹{product.mrp}
                        </span>
                        <Badge
                          variant={
                            (product.quantity_in_stock || 0) > 10
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          Stock: {product.quantity_in_stock || 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="text-center py-8 text-gray-500">
                No products found for "{searchTerm}"
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Search or scan products to begin</p>
                <p className="text-sm mt-2">Type at least 2 characters</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="bg-gray-50 dark:bg-gray-800 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 bg-white dark:bg-gray-900 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({itemCount} items)
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                disabled={cartItems.length === 0}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <Card key={item.product_id} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm flex-1 line-clamp-2">
                        {item.product.name}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 border rounded">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity - 1)
                          }
                          className="h-7 w-7 p-0"
                        >
                          −
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity + 1)
                          }
                          className="h-7 w-7 p-0"
                        >
                          +
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          ₹{item.unit_price} × {item.quantity}
                        </p>
                        <p className="font-bold text-orange-600">
                          ₹{item.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Checkout Section */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t space-y-3">
            {/* Customer Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Customer *
              </label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Payment
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(v: any) => setPaymentMethod(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Discount %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Tax %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm border-t pt-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({taxPercent}%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-1">
                <span>Total:</span>
                <span className="text-orange-600">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="h-12"
              >
                <Pause className="h-4 w-4 mr-2" />
                Hold (F3)
              </Button>
              <Button
                onClick={handleCompleteSale}
                disabled={cartItems.length === 0 || isProcessing}
                className={cn(
                  "h-12 text-lg font-bold",
                  "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                )}
              >
                <Calculator className="h-5 w-5 mr-2" />
                {isProcessing ? "Processing..." : "Complete (F2)"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
