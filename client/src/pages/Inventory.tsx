import { useEffect, useState } from "react";
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
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Package,
  QrCode,
  ArrowUpDown,
  Trash2,
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

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand &&
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (product) => product.category === categoryFilter
      );
    }

    // Sorting
    filtered.sort((a, b) => {
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

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, sortBy, sortOrder]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const products = await api.getProducts();
      setProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from products
  const categories = Array.from(
    new Set(products.map((p) => p.category))
  ).sort();

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

  const generateQRCode = async (productId: string) => {
    try {
      // This would typically generate a QR code image
      // For now, we'll just show the QR code text
      const product = products.find((p) => p.id === productId);
      if (product) {
        toast({
          title: "QR Code",
          description: `QR Code: ${product.qr_code}`,
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
        loadProducts();
      } else {
        throw new Error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

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
                    {categories.map((cat) => (
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
                  (p) => (p.quantity_in_stock || 0) <= (p.min_stock_level || 0)
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
                  {filteredProducts.map((product) => {
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
                              onClick={() => generateQRCode(product.id)}
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
    </div>
  );
}
