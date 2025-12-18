import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { api, type Product } from "@/lib/api";
import {
  Barcode,
  Search,
  Package,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Barcode Scanner for Physical Scanner Devices
 *
 * This component is designed to work with handheld/desktop barcode scanners
 * that act as keyboard input devices. These scanners:
 * - Type the barcode value directly into the focused input
 * - Usually end with Enter/Return key
 * - Don't require camera permissions
 *
 * Supports:
 * - Physical USB barcode scanners
 * - Bluetooth barcode scanners
 * - Manual keyboard entry
 */
export default function BarcodeScanner() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(1);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount for immediate scanning
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep input focused for continuous scanning
  useEffect(() => {
    const handleWindowClick = () => {
      inputRef.current?.focus();
    };

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const processBarcode = async (code: string) => {
    if (!code.trim()) return;

    setIsSearching(true);
    try {
      const foundProduct = await api.searchProductByCode(code);

      setProduct(foundProduct);
      setScanHistory((prev) => [code, ...prev.slice(0, 9)]); // Keep last 10 scans

      toast({
        title: "✓ Product Found",
        description: `${foundProduct.name} - ₹${foundProduct.mrp}`,
      });
    } catch (error: any) {
      setProduct(null);
      toast({
        title: "Product Not Found",
        description: error.message || `No product matches barcode: ${code}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setBarcodeInput(""); // Clear for next scan
      inputRef.current?.focus(); // Re-focus for next scan
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Physical scanners typically send Enter after barcode
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcode(barcodeInput);
    }
  };

  const getStockStatus = (product: Product) => {
    const stock = product.quantity_in_stock || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock === 0) {
      return {
        label: "Out of Stock",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-700 border-red-300",
      };
    } else if (stock < minLevel) {
      return {
        label: "Low Stock",
        variant: "destructive" as const,
        className: "bg-orange-100 text-orange-700 border-orange-300",
      };
    } else {
      return {
        label: "In Stock",
        variant: "default" as const,
        className: "bg-green-100 text-green-700 border-green-300",
      };
    }
  };

  const handleStockUpdate = async (delta: number) => {
    if (!product) return;

    const newQuantity = stockQuantity + delta;
    if (newQuantity < 1) return;

    setStockQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!product) return;

    toast({
      title: "Added to Cart",
      description: `${stockQuantity}x ${product.name}`,
    });

    // Reset for next scan
    setProduct(null);
    setStockQuantity(1);
    inputRef.current?.focus();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Barcode Scanner</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Scan products using your barcode scanner or enter manually
        </p>
      </div>

      {/* Instructions */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Barcode className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Using a Physical Scanner:</strong> Click in the input field
          below and scan. The barcode will be entered automatically.
          <br />
          <strong>Manual Entry:</strong> Type the barcode and press Enter.
        </AlertDescription>
      </Alert>

      {/* Barcode Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Scan or Enter Barcode
          </CardTitle>
          <CardDescription>
            Position your scanner and scan the product barcode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode / QR Code</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="barcode"
                  type="text"
                  placeholder="Ready to scan..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-mono text-lg"
                  autoComplete="off"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={isSearching || !barcodeInput.trim()}
                  size="lg"
                >
                  {isSearching ? (
                    <>Searching...</>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Scanner will automatically input here. Press Enter or click
                Search.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Product Details */}
      {product && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {product.category} {product.brand && `• ${product.brand}`}
                </CardDescription>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">MRP</p>
                <p className="text-xl font-semibold">₹{product.mrp}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Buying Cost</p>
                <p className="text-xl font-semibold">₹{product.buying_cost}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Stock</p>
                <p className="text-xl font-semibold">
                  {product.quantity_in_stock || 0} {product.unit || "pcs"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <Badge className={getStockStatus(product).className}>
                  {getStockStatus(product).label}
                </Badge>
              </div>
            </div>

            {/* Stock Alerts */}
            {product.quantity_in_stock === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This product is out of stock. Restock before selling.
                </AlertDescription>
              </Alert>
            )}

            {product.quantity_in_stock! > 0 &&
              product.quantity_in_stock! < (product.min_stock_level || 5) && (
                <Alert className="border-orange-300 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Low stock warning! Current: {product.quantity_in_stock},{" "}
                    Minimum: {product.min_stock_level}
                  </AlertDescription>
                </Alert>
              )}

            {/* Quantity Selector */}
            <div className="space-y-3">
              <Label>Quantity to Add</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStockUpdate(-1)}
                  disabled={stockQuantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) =>
                    setStockQuantity(parseInt(e.target.value) || 1)
                  }
                  className="w-24 text-center text-lg font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStockUpdate(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  className="ml-auto"
                  onClick={handleAddToCart}
                  disabled={!product.quantity_in_stock}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Bill
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            {(product.description || product.barcode) && (
              <div className="pt-4 border-t space-y-2">
                {product.barcode && (
                  <p className="text-sm">
                    <span className="font-medium">Barcode:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {product.barcode}
                    </code>
                  </p>
                )}
                {product.description && (
                  <p className="text-sm text-gray-600">{product.description}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {scanHistory.map((code, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="font-mono cursor-pointer"
                  onClick={() => processBarcode(code)}
                >
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
