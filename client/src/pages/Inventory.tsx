import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, type Product } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Plus, Search, QrCode, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  // Load products directly from API with abort controller
  const loadProducts = useCallback(
    async (retryCount = 0) => {
      const abortController = new AbortController();
      try {
        setLoading(true);
        const productsData = await api.getProducts();
        if (!abortController.signal.aborted) {
          setProducts(productsData);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error loading products:", error);

          // Retry logic for production resilience
          if (retryCount < 2) {
            console.log(`Retrying... attempt ${retryCount + 1}`);
            setTimeout(
              () => loadProducts(retryCount + 1),
              1000 * (retryCount + 1)
            );
            return;
          }

          toast({
            title: "Error",
            description: "Failed to load products. Please refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
      return () => abortController.abort();
    },
    [toast]
  );

  // Load products on mount with cleanup
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) {
        await loadProducts();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loadProducts]);

  // Memoize filtered and sorted products for performance
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(
      (product: Product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand &&
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (product: Product) => product.category === categoryFilter
      );
    }

    // Sort products
    filtered.sort((a: Product, b: Product) => {
      let aValue: any = a[sortBy as keyof Product];
      let bValue: any = b[sortBy as keyof Product];

      if (sortBy === "name" || sortBy === "category") {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      } else if (sortBy === "quantity_in_stock" || sortBy === "mrp") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortBy === "expiry_date") {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, sortBy, sortOrder]);

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

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysDiff = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24)
    );

    if (daysDiff < 0) {
      return { label: "Expired", variant: "destructive" as const };
    } else if (daysDiff <= 7) {
      return { label: `${daysDiff} days left`, variant: "secondary" as const };
    } else if (daysDiff <= 30) {
      return { label: `${daysDiff} days left`, variant: "outline" as const };
    }
    return null;
  };

  // Production-ready QR code generation with retry logic
  const generateQRCode = useCallback(
    async (productId: string, retryCount = 0) => {
      try {
        setGeneratingId(productId);
        const response = await fetch(`/api/products/${productId}/generate-qr`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 429 && retryCount < 3) {
            // Rate limited, retry with exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );
            return generateQRCode(productId, retryCount + 1);
          }
          throw new Error(
            `Failed to generate QR code: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Update local product data optimistically
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, qr_code: data.qr_code, qr_code_image: data.qr_code_image }
              : p
          )
        );

        // Update selected product if viewing
        if (selectedProduct?.id === productId) {
          setSelectedProduct((prev) =>
            prev
              ? {
                  ...prev,
                  qr_code: data.qr_code,
                  qr_code_image: data.qr_code_image,
                }
              : null
          );
          setQrDialogOpen(true);
        }

        toast({
          title: "QR Code Generated",
          description: `QR code generated for ${data.product?.name || "product"}`,
        });
      } catch (error) {
        console.error(`Error generating QR code for ${productId}:`, error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to generate QR code",
          variant: "destructive",
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [selectedProduct, toast]
  );

  // Batch generate QR codes for products without them - production optimized
  const batchGenerateQRCodes = useCallback(async () => {
    const productsNeedingQR = filteredProducts.filter(
      (p: Product) => !p.qr_code_image
    );

    if (productsNeedingQR.length === 0) {
      toast({
        title: "Info",
        description: "All products already have QR codes",
      });
      return;
    }

    setBatchGenerating(true);
    setGenerationProgress({ current: 0, total: productsNeedingQR.length });

    const results = { success: 0, failed: 0 };

    // Process in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < productsNeedingQR.length; i += batchSize) {
      const batch = productsNeedingQR.slice(
        i,
        Math.min(i + batchSize, productsNeedingQR.length)
      );

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map((product) => generateQRCode(product.id))
      );

      // Track results
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.success++;
        } else {
          results.failed++;
        }
      });

      // Update progress
      setGenerationProgress({
        current: Math.min(i + batchSize, productsNeedingQR.length),
        total: productsNeedingQR.length,
      });

      // Small delay between batches to avoid server overload
      if (i + batchSize < productsNeedingQR.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final results notification
    toast({
      title: results.failed === 0 ? "Success" : "Partial Complete",
      description:
        results.failed === 0
          ? `Generated QR codes for all ${results.success} products`
          : `Generated ${results.success} QR codes, ${results.failed} failed. Retry manually for failed items.`,
      variant: results.failed === 0 ? "default" : "destructive",
    });

    setBatchGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
  }, [filteredProducts, generateQRCode, toast]);

  // Generate barcode if missing - can be ISBN, EAN, or product ID
  const generateBarcode = useCallback(
    async (productId: string) => {
      try {
        setGeneratingId(productId);
        const response = await fetch(
          `/api/products/${productId}/generate-barcode`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate barcode");
        }

        const data = await response.json();

        // Update local product data
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, barcode: data.barcode } : p
          )
        );

        toast({
          title: "Barcode Generated",
          description: `Barcode: ${data.barcode}`,
        });
      } catch (error) {
        console.error(`Error generating barcode for ${productId}:`, error);
        toast({
          title: "Error",
          description: "Failed to generate barcode",
          variant: "destructive",
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [toast]
  );

  // Batch generate both QR and barcodes - optimized for scale
  const batchGenerateAllCodes = useCallback(async () => {
    const needsQR = filteredProducts.filter((p: Product) => !p.qr_code_image);
    const needsBarcode = filteredProducts.filter((p: Product) => !p.barcode);

    if (needsQR.length === 0 && needsBarcode.length === 0) {
      toast({
        title: "Info",
        description: "All products already have QR codes and barcodes",
      });
      return;
    }

    setBatchGenerating(true);
    const total = needsQR.length + needsBarcode.length;
    setGenerationProgress({ current: 0, total });

    let current = 0;

    // Generate QR codes first
    for (const product of needsQR) {
      await generateQRCode(product.id);
      current++;
      setGenerationProgress({ current, total });
    }

    // Then generate barcodes
    for (const product of needsBarcode) {
      await generateBarcode(product.id);
      current++;
      setGenerationProgress({ current, total });
    }

    toast({
      title: "Batch Generation Complete",
      description: `Generated codes for ${total} items`,
    });

    setBatchGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
  }, [filteredProducts, generateQRCode, generateBarcode, toast]);

  const viewQRCode = useCallback((product: Product) => {
    if (product.qr_code_image) {
      setSelectedProduct(product);
      setQrDialogOpen(true);
    } else {
      void generateQRCode(product.id);
    }
  }, [generateQRCode]);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!productToDelete) return;

    try {
      // Optimistic update: remove from UI immediately
      const productId = productToDelete.id;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setDeleteDialogOpen(false);
      setProductToDelete(null);

      // Delete on server
      await api.deleteProduct(productId);

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product. Refreshing...",
        variant: "destructive",
      });
      // Reload on error to sync state
      await loadProducts();
    }
  }, [productToDelete, loadProducts, toast]);

  const codeMissingCounts = useMemo(
    () => ({
      missingQR: filteredProducts.filter(
        (p: Product) => !p.qr_code_image
      ).length,
      missingBarcode: filteredProducts.filter(
        (p: Product) => !p.barcode
      ).length,
    }),
    [filteredProducts]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
        </div>
        <Button asChild>
          <Link to="/inventory/add">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Search & Filter Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category, or brand..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="quantity_in_stock">
                      Stock Quantity
                    </SelectItem>
                    <SelectItem value="mrp">Price (MRP)</SelectItem>
                    <SelectItem value="expiry_date">Expiry Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Select
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Showing {filteredProducts.length} filtered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                products.filter(
                  (p: Product) =>
                    (p.quantity_in_stock || 0) <= (p.min_stock_level || 0)
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need restock</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            {filteredProducts.length} of {products.length} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No products found matching your search."
                : "No products in inventory."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price (MRP)</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => {
                    const stockStatus = getStockStatus(product);
                    const expiryStatus = getExpiryStatus(
                      product.expiry_date || undefined
                    );

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.brand && (
                              <div className="text-sm text-muted-foreground">
                                {product.brand}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>
                                {product.quantity_in_stock} {product.unit}
                              </span>
                              <Badge
                                variant={stockStatus.variant}
                                className="text-xs"
                              >
                                {stockStatus.label}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {product.min_stock_level} {product.unit}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">₹{product.mrp}</div>
                            <div className="text-sm text-muted-foreground">
                              Cost: ₹{product.buying_cost}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.expiry_date ? (
                            <div className="space-y-1">
                              <div className="text-sm">
                                {new Date(
                                  product.expiry_date
                                ).toLocaleDateString("en-IN")}
                              </div>
                              {expiryStatus && (
                                <Badge
                                  variant={expiryStatus.variant}
                                  className="text-xs"
                                >
                                  {expiryStatus.label}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No expiry
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewQRCode(product)}
                              title={
                                product.qr_code_image
                                  ? "View QR Code"
                                  : "Generate QR Code"
                              }
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/inventory/edit/${product.id}`}>
                                Edit
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(product)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{productToDelete?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Display Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Scan this QR code to quickly add this product to bills
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {selectedProduct?.qr_code_image ? (
              <>
                <img
                  src={selectedProduct.qr_code_image}
                  alt={`QR Code for ${selectedProduct.name}`}
                  className="w-64 h-64 border rounded-lg"
                />
                <div className="text-sm text-muted-foreground text-center space-y-1">
                  <div>
                    QR Code: {selectedProduct.qr_code || selectedProduct.id}
                  </div>
                  <div>Product: {selectedProduct.name}</div>
                  <div>Price: ₹{selectedProduct.mrp}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selectedProduct?.qr_code_image) return;
                      const link = document.createElement("a");
                      link.href = selectedProduct.qr_code_image;
                      link.download = `QR-${selectedProduct.name}.png`;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    Print
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                No QR code generated yet. Click Generate to create one.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
