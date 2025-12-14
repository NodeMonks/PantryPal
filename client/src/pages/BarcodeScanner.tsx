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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, type Product } from "@/lib/api";
import {
  Barcode,
  Settings,
  TestTube,
  Activity,
  Plus,
  Minus,
  Package,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BarcodeScanner() {
  // Core state
  const [barcodeInput, setBarcodeInput] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; time: number; found: boolean }>
  >([]);

  // Settings
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [continuousMode, setContinuousMode] = useState(true);
  const [debounceTime, setDebounceTime] = useState(500);
  const [autoFocus, setAutoFocus] = useState(true);
  const [playSound, setPlaySound] = useState(true);

  // Quick actions
  const [stockQuantity, setStockQuantity] = useState(1);

  // Diagnostics
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [rawScans, setRawScans] = useState<
    Array<{ input: string; timestamp: number; chars: string[] }>
  >([]);

  // Device connection tracking
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceActive, setDeviceActive] = useState(false);
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const [deviceConnectionNotified, setDeviceConnectionNotified] =
    useState(false);

  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deviceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Device connection detection
  useEffect(() => {
    const handleInputFocus = () => {
      if (!deviceConnected) {
        setDeviceConnected(true);
        if (!deviceConnectionNotified) {
          toast({
            title: "🔌 Barcode Device Connected",
            description: "Scanner detected and ready to use",
          });
          setDeviceConnectionNotified(true);
        }
      }
      setDeviceActive(true);
      setLastInputTime(Date.now());

      if (deviceTimeoutRef.current) {
        clearTimeout(deviceTimeoutRef.current);
      }
    };

    const handleInputBlur = () => {
      if (deviceTimeoutRef.current) {
        clearTimeout(deviceTimeoutRef.current);
      }
      deviceTimeoutRef.current = setTimeout(() => {
        setDeviceActive(false);
      }, 2000);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener("focus", handleInputFocus);
      input.addEventListener("blur", handleInputBlur);
    }

    return () => {
      if (input) {
        input.removeEventListener("focus", handleInputFocus);
        input.removeEventListener("blur", handleInputBlur);
      }
      if (deviceTimeoutRef.current) {
        clearTimeout(deviceTimeoutRef.current);
      }
    };
  }, [deviceConnected, deviceConnectionNotified, toast]);

  // Monitor for device disconnection
  useEffect(() => {
    const checkDeviceActive = setInterval(() => {
      const timeSinceLastInput = Date.now() - lastInputTime;
      if (timeSinceLastInput > 10000 && deviceConnected && !isSearching) {
        setDeviceConnected(false);
        setDeviceActive(false);
        setDeviceConnectionNotified(false);
        toast({
          title: "🔌 Barcode Device Disconnected",
          description: "Scanner is no longer detected",
          variant: "destructive",
        });
      }
    }, 5000);

    return () => clearInterval(checkDeviceActive);
  }, [lastInputTime, deviceConnected, isSearching, toast]);

  // Auto-focus management
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, product]);

  // Refocus after scan in continuous mode
  useEffect(() => {
    if (continuousMode && inputRef.current && !isSearching) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [continuousMode, isSearching, product]);

  // Play scan sound
  const playBeep = () => {
    if (playSound) {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  // Search for product by barcode
  const searchProduct = async (code: string) => {
    if (!code.trim()) return;

    const now = Date.now();

    // Debouncing - prevent duplicate scans within debounce window
    if (now - lastScanTime < debounceTime) {
      console.log("Scan ignored (debounce)");
      return;
    }

    setLastScanTime(now);
    setIsSearching(true);

    try {
      playBeep();
      const foundProduct = await api.searchProductByCode(code);

      setProduct(foundProduct);
      setScanHistory((prev) => [
        { code, time: now, found: true },
        ...prev.slice(0, 9),
      ]);

      toast({
        title: "✅ Product Found!",
        description: `${foundProduct.name} - Stock: ${
          foundProduct.quantity_in_stock || 0
        }`,
      });

      if (continuousMode) {
        setBarcodeInput("");
      }
    } catch (error: any) {
      console.error("Error finding product:", error);
      setProduct(null);
      setScanHistory((prev) => [
        { code, time: now, found: false },
        ...prev.slice(0, 9),
      ]);

      toast({
        title: "❌ Product Not Found",
        description: `No product with code: ${code}`,
        variant: "destructive",
      });

      if (continuousMode) {
        setBarcodeInput("");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setBarcodeInput(value);
    setLastInputTime(Date.now());
    if (!deviceConnected) {
      setDeviceConnected(true);
    }
    if (!deviceActive) {
      setDeviceActive(true);
    }

    // Diagnostic mode - capture raw input
    if (diagnosticMode) {
      setRawScans((prev) => [
        {
          input: value,
          timestamp: Date.now(),
          chars: value.split(""),
        },
        ...prev.slice(0, 9),
      ]);
    }

    // Auto-submit when scanner sends data rapidly
    if (autoSubmit && value.length > 3) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        // If input hasn't changed in 100ms, assume scanner finished
        if (inputRef.current?.value === value) {
          searchProduct(value);
        }
      }, 100);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      searchProduct(barcodeInput);
    }
  };

  // Manual search button
  const handleManualSearch = () => {
    searchProduct(barcodeInput);
  };

  // Quick stock actions
  const handleStockUpdate = async (operation: "add" | "subtract" | "set") => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${product.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: stockQuantity, operation }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update stock");
      }

      const updated = await response.json();
      setProduct(updated);

      toast({
        title: "✅ Stock Updated!",
        description: `${
          operation === "add"
            ? "Added"
            : operation === "subtract"
            ? "Removed"
            : "Set"
        } ${stockQuantity} ${product.unit || "units"}`,
      });

      setStockQuantity(1);
    } catch (error: any) {
      console.error("Error updating stock:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  // Reset
  const handleReset = () => {
    setBarcodeInput("");
    setProduct(null);
    inputRef.current?.focus();
  };

  // Stock status badge
  const getStockStatus = (product: Product) => {
    const stock = product.quantity_in_stock || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock === 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    } else if (stock <= minLevel) {
      return { label: "Low Stock", variant: "secondary" as const };
    } else {
      return { label: "In Stock", variant: "default" as const };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Barcode className="h-8 w-8" />
          Barcode Scanner
        </h1>
        <p className="text-muted-foreground mt-2">
          Professional barcode scanning for retail inventory management
        </p>
      </div>

      {/* Device Connection Status */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          {deviceConnected ? (
            <>
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">Connected</span>
              </div>
              {deviceActive && (
                <Badge className="animate-pulse bg-green-100 text-green-800">
                  Active
                </Badge>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-600">Disconnected</span>
              </div>
            </>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {deviceConnected
            ? deviceActive
              ? "Scanner ready"
              : "No recent activity"
            : "Awaiting scanner input"}
        </span>
      </div>

      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Scanner
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Barcodes
          </TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Barcode className="h-5 w-5" />
                  Scan Barcode
                </CardTitle>
                <CardDescription>
                  {continuousMode
                    ? "Continuous scanning mode - scan multiple items"
                    : "Single scan mode"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="barcode-input"
                      className="flex items-center gap-2"
                    >
                      Barcode Input
                      {autoFocus && (
                        <Badge variant="outline" className="text-xs">
                          Auto-Focus
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        id="barcode-input"
                        placeholder="Scan or type barcode here..."
                        value={barcodeInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isSearching}
                        className="text-lg font-mono"
                        autoFocus={autoFocus}
                      />
                      <Button
                        onClick={handleManualSearch}
                        disabled={isSearching || !barcodeInput.trim()}
                        size="lg"
                      >
                        <Barcode className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {autoSubmit
                        ? "🔄 Auto-submit enabled - scanner will trigger search automatically"
                        : "Press Enter to search"}
                    </p>
                  </div>

                  {/* Status */}
                  {isSearching && (
                    <Alert>
                      <Zap className="h-4 w-4 animate-pulse" />
                      <AlertDescription>
                        Searching for product...
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Quick Actions */}
                  {continuousMode && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        Reset
                      </Button>
                      <Badge variant="secondary" className="ml-auto">
                        {scanHistory.length} scans
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Scan History */}
                {scanHistory.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Recent Scans</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {scanHistory.map((scan, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                        >
                          <span className="font-mono">{scan.code}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(scan.time).toLocaleTimeString()}
                            </span>
                            {scan.found ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-semibold">
                          {product.name}
                        </h3>
                        {product.brand && (
                          <p className="text-muted-foreground">
                            {product.brand}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{product.category}</Badge>
                        {(() => {
                          const stockStatus = getStockStatus(product);
                          return (
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.label}
                            </Badge>
                          );
                        })()}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-sm font-medium">MRP</Label>
                          <p className="text-2xl font-semibold text-green-600">
                            ₹{Number(product.mrp).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Current Stock
                          </Label>
                          <p className="text-2xl font-semibold">
                            {product.quantity_in_stock || 0}{" "}
                            {product.unit || "units"}
                          </p>
                        </div>
                      </div>

                      {/* Quick Stock Actions */}
                      <div className="border-t pt-4 space-y-3">
                        <Label className="text-sm font-medium">
                          ⚡ Quick Stock Update
                        </Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            min="1"
                            value={stockQuantity}
                            onChange={(e) =>
                              setStockQuantity(parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate("add")}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate("subtract")}
                            className="flex-1"
                          >
                            <Minus className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm border-t pt-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Product ID:
                          </span>
                          <span className="font-mono text-xs">
                            {product.id}
                          </span>
                        </div>
                        {product.barcode && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Barcode:
                            </span>
                            <span className="font-mono">{product.barcode}</span>
                          </div>
                        )}
                        {product.expiry_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Expiry:
                            </span>
                            <span>
                              {new Date(
                                product.expiry_date
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Barcode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Ready to Scan
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Scan a barcode or enter it manually to see product details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Scanner Settings</CardTitle>
              <CardDescription>
                Configure barcode scanner behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Submit</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically search when barcode is detected (for USB
                      scanners)
                    </p>
                  </div>
                  <Switch
                    checked={autoSubmit}
                    onCheckedChange={setAutoSubmit}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Continuous Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Clear input and stay ready for next scan
                    </p>
                  </div>
                  <Switch
                    checked={continuousMode}
                    onCheckedChange={setContinuousMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Focus</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep input field focused for scanner input
                    </p>
                  </div>
                  <Switch checked={autoFocus} onCheckedChange={setAutoFocus} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scan Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play beep sound on successful scan
                    </p>
                  </div>
                  <Switch checked={playSound} onCheckedChange={setPlaySound} />
                </div>

                <div className="space-y-2">
                  <Label>Debounce Time: {debounceTime}ms</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1000"
                    step="100"
                    value={debounceTime}
                    onChange={(e) => setDebounceTime(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum time between scans to prevent duplicates
                  </p>
                </div>
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Scanner Configuration Tips:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>
                      Enable "Carriage Return" (Enter key) suffix on your
                      scanner
                    </li>
                    <li>Disable any prefix characters unless needed</li>
                    <li>
                      Enable symbologies: EAN-13, UPC-A, Code-128, Code-39
                    </li>
                    <li>
                      Set scanner to "Keyboard Wedge" mode for USB connection
                    </li>
                    <li>
                      Test with the Diagnostics tab to verify scanner output
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle>Scanner Diagnostics</CardTitle>
              <CardDescription>
                Test and debug your barcode scanner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Diagnostic Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Capture raw scanner input for debugging
                  </p>
                </div>
                <Switch
                  checked={diagnosticMode}
                  onCheckedChange={setDiagnosticMode}
                />
              </div>

              {diagnosticMode && (
                <Alert>
                  <Activity className="h-4 w-4 animate-pulse" />
                  <AlertDescription>
                    Diagnostic mode active - scan a barcode to see raw input
                    data
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Test Input Field</Label>
                <Input
                  placeholder="Scan barcode here to test..."
                  className="font-mono text-lg"
                  onFocus={() => setDiagnosticMode(true)}
                />
              </div>

              {rawScans.length > 0 && (
                <div className="space-y-2">
                  <Label>Raw Scan Data</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rawScans.map((scan, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              Scan #{rawScans.length - idx}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(scan.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono text-sm bg-muted p-2 rounded">
                            {scan.input}
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">
                                Length:
                              </span>
                              <span>{scan.input.length} characters</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">
                                Characters:
                              </span>
                              <span className="font-mono">
                                {scan.chars.join(" ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRawScans([])}
                    className="w-full"
                  >
                    Clear Diagnostic Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Barcodes Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Barcodes</CardTitle>
              <CardDescription>
                Sample barcodes for testing your scanner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Print this page or scan directly from screen to test your
                  barcode scanner configuration
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    format: "EAN-13",
                    code: "5901234123457",
                    desc: "Standard retail barcode",
                  },
                  {
                    format: "UPC-A",
                    code: "012345678905",
                    desc: "North American retail",
                  },
                  {
                    format: "Code-128",
                    code: "TEST12345",
                    desc: "Alphanumeric code",
                  },
                  {
                    format: "Code-39",
                    code: "SAMPLE123",
                    desc: "Industrial barcode",
                  },
                  {
                    format: "Test ID",
                    code: "PROD001",
                    desc: "Simple product ID",
                  },
                  {
                    format: "Test ID",
                    code: "ABC123XYZ",
                    desc: "Mixed characters",
                  },
                ].map((sample, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge>{sample.format}</Badge>
                      </div>
                      <div className="bg-white p-4 rounded border-2 border-dashed text-center">
                        <div className="font-mono text-2xl font-bold mb-2">
                          {sample.code}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sample.desc}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setBarcodeInput(sample.code);
                          inputRef.current?.focus();
                        }}
                      >
                        Use This Code
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Quick Test Instructions:</Label>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to the "Scanner" tab</li>
                  <li>Click one of the "Use This Code" buttons above</li>
                  <li>The code will be filled in the input field</li>
                  <li>Press Enter or click the search button</li>
                  <li>
                    If you have a product with this barcode, it will be found
                  </li>
                </ol>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> These are sample codes. Add products
                  with these barcodes in your inventory to test the full
                  scanning workflow.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
