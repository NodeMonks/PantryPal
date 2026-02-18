import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/page-skeleton";
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
import {
  Plus,
  Search,
  QrCode,
  Trash2,
  Package,
  Tag,
  AlertTriangle,
} from "lucide-react";
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
  const { t } = useTranslation();
  const { toast } = useToast();
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
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
  });

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
              1000 * (retryCount + 1),
            );
            return;
          }

          toast({
            title: t("common.error"),
            description: t("inventory.failedLoad"),
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
    [toast],
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
    const search = searchTerm.toLowerCase();

    let filtered = products.filter((product: Product) => {
      const name = (product.name || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      const brand = (product.brand || "").toLowerCase();

      return (
        name.includes(search) ||
        category.includes(search) ||
        (!!brand && brand.includes(search))
      );
    });

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (product: Product) => (product.category || "") === categoryFilter,
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
      return {
        label: t("inventory.outOfStock"),
        variant: "destructive" as const,
      };
    } else if (stock <= minLevel) {
      return { label: t("inventory.lowStock"), variant: "secondary" as const };
    } else {
      return { label: t("inventory.inStock"), variant: "default" as const };
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysDiff = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24),
    );

    if (daysDiff < 0) {
      return { label: t("inventory.expired"), variant: "destructive" as const };
    } else if (daysDiff <= 7) {
      return {
        label: t("inventory.daysLeft", { count: daysDiff }),
        variant: "secondary" as const,
      };
    } else if (daysDiff <= 30) {
      return {
        label: t("inventory.daysLeft", { count: daysDiff }),
        variant: "outline" as const,
      };
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
              setTimeout(resolve, 1000 * Math.pow(2, retryCount)),
            );
            return generateQRCode(productId, retryCount + 1);
          }
          throw new Error(`Failed to generate QR code: ${response.statusText}`);
        }

        const data = await response.json();

        // Update local product data optimistically
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  qr_code: data.qr_code,
                  qr_code_image: data.qr_code_image,
                }
              : p,
          ),
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
              : null,
          );
          setQrDialogOpen(true);
        }

        toast({
          title: t("inventory.qrCodeGenerated"),
          description: `QR code generated for ${
            data.product?.name || "product"
          }`,
        });
      } catch (error) {
        console.error(`Error generating QR code for ${productId}:`, error);
        toast({
          title: t("common.error"),
          description:
            error instanceof Error ? error.message : t("inventory.failedQr"),
          variant: "destructive",
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [selectedProduct, toast],
  );

  // Batch generate QR codes for products without them - production optimized
  const batchGenerateQRCodes = useCallback(async () => {
    const productsNeedingQR = filteredProducts.filter(
      (p: Product) => !p.qr_code_image,
    );

    if (productsNeedingQR.length === 0) {
      toast({
        title: t("common.info"),
        description: t("inventory.allHaveQr"),
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
        Math.min(i + batchSize, productsNeedingQR.length),
      );

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map((product) => generateQRCode(product.id)),
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
      title:
        results.failed === 0
          ? t("common.success")
          : t("inventory.partialComplete"),
      description:
        results.failed === 0
          ? t("inventory.generatedAllQr", { count: results.success })
          : t("inventory.generatedPartialQr", {
              success: results.success,
              failed: results.failed,
            }),
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
          },
        );

        if (!response.ok) {
          throw new Error("Failed to generate barcode");
        }

        const data = await response.json();

        // Update local product data
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, barcode: data.barcode } : p,
          ),
        );

        toast({
          title: t("inventory.barcodeGenerated"),
          description: `Barcode: ${data.barcode}`,
        });
      } catch (error) {
        console.error(`Error generating barcode for ${productId}:`, error);
        toast({
          title: t("common.error"),
          description: t("inventory.failedBarcode"),
          variant: "destructive",
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [toast],
  );

  // Batch generate both QR and barcodes - optimized for scale
  const batchGenerateAllCodes = useCallback(async () => {
    const needsQR = filteredProducts.filter((p: Product) => !p.qr_code_image);
    const needsBarcode = filteredProducts.filter((p: Product) => !p.barcode);

    if (needsQR.length === 0 && needsBarcode.length === 0) {
      toast({
        title: t("common.info"),
        description: t("inventory.allHaveCodes"),
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
      title: t("inventory.batchComplete"),
      description: t("inventory.generatedCodes", { count: total }),
    });

    setBatchGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
  }, [filteredProducts, generateQRCode, generateBarcode, toast]);

  const viewQRCode = useCallback(
    (product: Product) => {
      if (product.qr_code_image) {
        setSelectedProduct(product);
        setQrDialogOpen(true);
      } else {
        void generateQRCode(product.id);
      }
    },
    [generateQRCode],
  );

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
        title: t("common.success"),
        description: t("inventory.deleteSuccess"),
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: t("common.error"),
        description: t("inventory.deleteFailed"),
        variant: "destructive",
      });
      // Reload on error to sync state
      await loadProducts();
    }
  }, [productToDelete, loadProducts, toast]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      products.map((p: Product) => p.category).filter(Boolean),
    );
    return Array.from(uniqueCategories).sort();
  }, [products]);

  const codeMissingCounts = useMemo(
    () => ({
      missingQR: filteredProducts.filter((p: Product) => !p.qr_code_image)
        .length,
      missingBarcode: filteredProducts.filter((p: Product) => !p.barcode)
        .length,
    }),
    [filteredProducts],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("inventory.title")}
          </h1>
          <p className="text-muted-foreground">{t("inventory.subtitle")}</p>
        </div>
        <Button
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 h-11"
        >
          <Link to="/inventory/add">
            <Plus className="h-4 w-4" />
            {t("inventory.addProduct")}
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-4 border border-border/50 shadow-sm bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
              <Search className="h-4 w-4" />
              {t("inventory.searchFilter")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("common.search")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("inventory.searchPlaceholder")}
                    className="pl-10 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.category")}</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("inventory.allCategories")}
                    </SelectItem>
                    {categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.sortBy")}</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      {t("inventory.sortName")}
                    </SelectItem>
                    <SelectItem value="category">
                      {t("inventory.category")}
                    </SelectItem>
                    <SelectItem value="quantity_in_stock">
                      {t("inventory.sortStockQty")}
                    </SelectItem>
                    <SelectItem value="mrp">
                      {t("inventory.sortPriceMrp")}
                    </SelectItem>
                    <SelectItem value="expiry_date">
                      {t("inventory.sortExpiry")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.order")}</Label>
                <Select
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      {t("inventory.ascending")}
                    </SelectItem>
                    <SelectItem value="desc">
                      {t("inventory.descending")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Products */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Package className="h-4 w-4 text-white" />
              </div>
              {t("inventory.totalProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {products.length}
            </div>
            <p className="text-xs text-blue-200 mt-1">
              {t("inventory.showingFiltered", {
                count: filteredProducts.length,
              })}
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-indigo-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <Tag className="h-4 w-4 text-white" />
              </div>
              {t("inventory.categories")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {categories.length}
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              {t("inventory.uniqueCategories")}
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div
            className={`absolute inset-0 ${
              products.filter(
                (p: Product) =>
                  (p.quantity_in_stock || 0) <= (p.min_stock_level || 0),
              ).length > 0
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : "bg-gradient-to-br from-emerald-500 to-emerald-700"
            }`}
          />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-100 font-medium">
              <div className="bg-white/20 rounded-lg p-1.5">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              {t("inventory.lowStockItems")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white">
              {
                products.filter(
                  (p: Product) =>
                    (p.quantity_in_stock || 0) <= (p.min_stock_level || 0),
                ).length
              }
            </div>
            <p className="text-xs text-orange-100 mt-1">
              {t("inventory.needRestock")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t("inventory.products")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("inventory.showing", {
                  filtered: filteredProducts.length,
                  total: products.length,
                })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton
              rows={7}
              headers={[
                t("inventory.product"),
                t("inventory.category"),
                t("inventory.stock"),
                t("inventory.priceMrp"),
                t("inventory.expiry"),
                t("common.actions"),
              ]}
            />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? t("inventory.noProductsFound")
                : t("inventory.noProducts")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">
                      {t("inventory.product")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("inventory.category")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("inventory.stock")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("inventory.priceMrp")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("inventory.expiry")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product, idx: number) => {
                    const stockStatus = getStockStatus(product);
                    const expiryStatus = getExpiryStatus(
                      product.expiry_date || undefined,
                    );
                    const isOutOfStock = (product.quantity_in_stock || 0) === 0;
                    const isLowStock =
                      !isOutOfStock &&
                      (product.quantity_in_stock || 0) <=
                        (product.min_stock_level || 0);

                    return (
                      <TableRow
                        key={product.id}
                        className={`transition-colors ${
                          isOutOfStock
                            ? "bg-red-50/50 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20 border-l-2 border-l-red-400"
                            : isLowStock
                              ? "bg-orange-50/40 hover:bg-orange-50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20 border-l-2 border-l-orange-400"
                              : idx % 2 === 0
                                ? "hover:bg-muted/30"
                                : "bg-muted/10 hover:bg-muted/30"
                        }`}
                      >
                        <TableCell>
                          <div>
                            <div className="font-semibold text-foreground">
                              {product.name}
                            </div>
                            {product.brand && (
                              <div className="text-xs text-muted-foreground">
                                {product.brand}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-100">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  isOutOfStock
                                    ? "text-red-600"
                                    : isLowStock
                                      ? "text-orange-600"
                                      : "text-emerald-700 dark:text-emerald-400"
                                }`}
                              >
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
                              {t("inventory.minStock", {
                                min: product.min_stock_level,
                                unit: product.unit,
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400">
                              ₹{product.mrp}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("inventory.cost")}: ₹{product.buying_cost}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.expiry_date ? (
                            <div className="space-y-1">
                              <div className="text-sm">
                                {new Date(
                                  product.expiry_date,
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
                            <span className="text-muted-foreground text-sm">
                              {t("inventory.noExpiry")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
                              onClick={() => viewQRCode(product)}
                              title={
                                product.qr_code_image
                                  ? t("inventory.viewQr")
                                  : t("inventory.generateQr")
                              }
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                            >
                              <Link to={`/inventory/edit/${product.id}`}>
                                {t("common.edit")}
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950"
                              onClick={() => handleDeleteClick(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            <AlertDialogTitle>
              {t("inventory.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.deleteConfirmDesc", {
                name: productToDelete?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Display Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("inventory.qrDialogTitle", {
                name: selectedProduct?.name ?? "",
              })}
            </DialogTitle>
            <DialogDescription>{t("inventory.qrDialogDesc")}</DialogDescription>
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
                    {t("inventory.qrCode")}:{" "}
                    {selectedProduct.qr_code || selectedProduct.id}
                  </div>
                  <div>
                    {t("inventory.product")}: {selectedProduct.name}
                  </div>
                  <div>
                    {t("inventory.price")}: ₹{selectedProduct.mrp}
                  </div>
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
                    {t("common.download")}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    {t("common.print")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                {t("inventory.noQrYet")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
