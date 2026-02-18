import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { useProductStore } from "@/stores/productStore";
import { useAuth } from "@/contexts/AuthContext";

export default function AddProduct() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    mrp: "",
    buying_cost: "",
    manufacturing_date: "",
    expiry_date: "",
    quantity_in_stock: "",
    min_stock_level: "",
    unit: "piece",
    description: "",
    barcode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const productStore = useProductStore();
  const { user } = useAuth();

  const categories = [
    "Rice & Grains",
    "Pulses",
    "Oil & Ghee",
    "Spices",
    "Dairy",
    "Vegetables",
    "Snacks",
    "Beverages",
    "Personal Care",
    "Instant Food",
    "Cleaning",
  ];

  const units = ["piece", "kg", "litre", "gram", "packet", "bottle", "box"];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateQRCode = () => {
    // Generate a temporary product ID (will be replaced by server-generated UUID)
    const productId = `PROD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Store just the product ID in the QR code (not the full object)
    // This ensures consistency with Inventory page generation
    // The barcode scanner will read this and we'll extract it for product lookup
    const qrData = productId;

    setGeneratedQR(qrData);
    setFormData((prev) => ({ ...prev, barcode: productId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.category ||
      !formData.mrp ||
      !formData.buying_cost
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate positive numbers
    if (
      parseFloat(formData.mrp) <= 0 ||
      parseFloat(formData.buying_cost) <= 0
    ) {
      toast({
        title: "Error",
        description: "MRP and Buying Cost must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.quantity_in_stock &&
      parseInt(formData.quantity_in_stock) < 0
    ) {
      toast({
        title: "Error",
        description: "Stock quantity cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (formData.min_stock_level && parseInt(formData.min_stock_level) < 0) {
      toast({
        title: "Error",
        description: "Minimum stock level cannot be negative",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare product data with proper type conversion
      const productData = {
        name: formData.name?.trim(),
        category: formData.category?.trim(),
        brand: formData.brand?.trim() || undefined,
        barcode: formData.barcode?.trim() || undefined,
        qr_code: generatedQR || undefined,
        mrp: (parseFloat(formData.mrp) || 0).toString(),
        buying_cost: (parseFloat(formData.buying_cost) || 0).toString(),
        manufacturing_date: formData.manufacturing_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 5,
        unit: formData.unit || "piece",
        description: formData.description?.trim() || undefined,
      };

      console.log("📤 Sending product data:", productData);

      await api.createProduct(productData);

      toast({
        title: "Success",
        description: "Product added successfully!",
      });

      // Refresh product store to show new product
      if (user?.org_id) {
        console.log("🔄 Refreshing product store...");
        await productStore.loadProducts(user.org_id);
      }

      navigate("/inventory");
    } catch (error) {
      console.error("❌ Error adding product:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to add product";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("addProduct.title")}
          </h1>
          <p className="text-muted-foreground">{t("addProduct.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("addProduct.productInfo")}
              </CardTitle>
              <CardDescription>
                {t("addProduct.productInfoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("addProduct.productName")}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder={t("addProduct.namePlaceholder")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("addProduct.category")}</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("category", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("addProduct.selectCategory")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">{t("addProduct.brand")}</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) =>
                        handleInputChange("brand", e.target.value)
                      }
                      placeholder={t("addProduct.brandPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">{t("addProduct.unit")}</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("unit", value)
                      }
                      defaultValue="piece"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="mrp">{t("addProduct.mrp")}</Label>
                    <Input
                      id="mrp"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.mrp}
                      onChange={(e) => handleInputChange("mrp", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buying_cost">
                      {t("addProduct.buyingCost")}
                    </Label>
                    <Input
                      id="buying_cost"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.buying_cost}
                      onChange={(e) =>
                        handleInputChange("buying_cost", e.target.value)
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_in_stock">
                      {t("addProduct.initialStock")}
                    </Label>
                    <Input
                      id="quantity_in_stock"
                      type="number"
                      min="0"
                      value={formData.quantity_in_stock}
                      onChange={(e) =>
                        handleInputChange("quantity_in_stock", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturing_date">
                      {t("addProduct.mfgDate")}
                    </Label>
                    <Input
                      id="manufacturing_date"
                      type="date"
                      value={formData.manufacturing_date}
                      onChange={(e) =>
                        handleInputChange("manufacturing_date", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">
                      {t("addProduct.expiryDate")}
                    </Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) =>
                        handleInputChange("expiry_date", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock_level">
                      {t("addProduct.minStockLevel")}
                    </Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      min="0"
                      value={formData.min_stock_level}
                      onChange={(e) =>
                        handleInputChange("min_stock_level", e.target.value)
                      }
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("addProduct.description")}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder={t("addProduct.descPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? t("addProduct.adding")
                      : t("addProduct.addBtn")}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to="/inventory">{t("addProduct.cancel")}</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t("addProduct.qrGenerator")}
              </CardTitle>
              <CardDescription>
                {t("addProduct.qrGeneratorDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generateQRCode}
                disabled={
                  !formData.name || !formData.mrp || !formData.buying_cost
                }
                className="w-full"
              >
                {t("addProduct.generateQr")}
              </Button>

              {(!formData.name || !formData.mrp || !formData.buying_cost) && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("addProduct.qrHint")}
                </p>
              )}

              {generatedQR && (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border">
                    <QRCode
                      value={generatedQR}
                      size={200}
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="text-xs space-y-1 text-center">
                    <p className="font-medium text-foreground">
                      {formData.name}
                    </p>
                    <p className="text-muted-foreground">
                      MRP: ₹{formData.mrp}
                    </p>
                    {formData.expiry_date && (
                      <p className="text-muted-foreground">
                        Exp:{" "}
                        {new Date(formData.expiry_date).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      ID: {formData.barcode}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const canvas = document.querySelector("canvas");
                      if (canvas) {
                        const link = document.createElement("a");
                        link.download = `qr-${formData.name.replace(
                          /[^a-zA-Z0-9]/g,
                          "-",
                        )}.png`;
                        link.href = canvas.toDataURL();
                        link.click();
                      }
                    }}
                  >
                    {t("addProduct.downloadQr")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
