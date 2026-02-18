import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoadingSkeleton } from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerStore } from "@/stores/customerStore";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Customer } from "@/lib/api";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const customerStore = useCustomerStore();
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.org_id) {
      customerStore.loadCustomers(user.org_id);
    }
  }, [user?.org_id, customerStore]);

  useEffect(() => {
    const filtered = customerStore.customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.email &&
          customer.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );
    setFilteredCustomers(filtered);
  }, [customerStore.customers, searchTerm]);

  const loadCustomers = async () => {
    if (user?.org_id) {
      await customerStore.loadCustomers(user.org_id);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Validate phone number to only allow digits, spaces, +, and -
    if (field === "phone") {
      const sanitized = value.replace(/[^0-9+\-\s]/g, "");
      setFormData((prev) => ({ ...prev, [field]: sanitized }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate phone format if provided (10-15 digits)
    if (
      formData.phone &&
      !formData.phone.replace(/[\s+\-]/g, "").match(/^\d{10,15}$/)
    ) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (10-15 digits)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await customerStore.createCustomer({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
      } as any);

      toast({
        title: "Success",
        description: "Customer added successfully!",
      });

      setIsDialogOpen(false);
      setFormData({ name: "", phone: "", email: "", address: "" });
      loadCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  if (customerStore.loading) {
    return (
      <PageLoadingSkeleton
        statCols={3}
        tableRows={6}
        tableCols={4}
        showAction
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("customers.title")}
          </h1>
          <p className="text-muted-foreground">{t("customers.subtitle")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("customers.addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("customers.addNewCustomer")}</DialogTitle>
              <DialogDescription>
                {t("customers.customerInfo")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder={t("customers.namePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("common.phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder={t("customers.phonePlaceholder")}
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder={t("customers.emailPlaceholder")}
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("common.address")}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder={t("customers.addressPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("customers.adding")}
                    </span>
                  ) : (
                    t("customers.addCustomer")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("customers.totalCustomers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerStore.customers.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("customers.withPhone")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {customerStore.customers.filter((c) => c.phone).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("customers.withEmail")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customerStore.customers.filter((c) => c.email).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("customers.searchCustomers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("customers.searchPlaceholder")}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("customers.customerList")}</CardTitle>
          <CardDescription>
            {filteredCustomers.length} of {customerStore.customers.length}{" "}
            customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? t("customers.noCustomersFound")
                : t("customers.noCustomersYet")}
              {!searchTerm && (
                <div className="mt-4">
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("customers.addFirstCustomer")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>{t("common.address")}</TableHead>
                    <TableHead>Added On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {!customer.phone && !customer.email && (
                            <span className="text-muted-foreground text-sm">
                              {t("customers.noContactInfo")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.address ? (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <span className="max-w-xs truncate">
                              {customer.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("customers.noAddress")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDate(customer.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
