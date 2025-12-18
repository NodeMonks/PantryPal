// API client to replace Supabase calls
const API_BASE = "/api";

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  mrp: string;
  buying_cost: string;
  quantity_in_stock: number | null;
  min_stock_level: number | null;
  unit: string | null;
  expiry_date: string | null;
  qr_code: string | null;
  qr_code_image?: string | null;
  created_at: string;
  description?: string | null;
  manufacturing_date?: string | null;
  updated_at?: string;
  barcode?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  customer_id: string | null;
  total_amount: string;
  discount_amount: string | null;
  tax_amount: string | null;
  final_amount: string;
  payment_method: string | null;
  created_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  todaySales: number;
  totalRevenue: number;
  expiringProducts: number;
  totalCustomers: number;
  lowStockProducts: Product[];
  expiringProductsList: Product[];
}

class ApiClient {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include", // Include cookies for authentication
    });
    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = "/login";
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for authentication
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login";
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for authentication
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login";
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  // Products
  async getProducts(orgId?: string): Promise<Product[]> {
    return this.get<Product[]>("/products");
  }

  async getProduct(id: string): Promise<Product> {
    return this.get<Product>(`/products/${id}`);
  }

  async searchProductByCode(code: string): Promise<Product> {
    const response = await fetch(
      `${API_BASE}/products/search/${encodeURIComponent(code)}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login";
      }
      if (response.status === 404) {
        throw new Error(`No product found with code: ${code}`);
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    return this.post<Product>("/products", product);
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return this.put<Product>(`/products/${id}`, product);
  }

  async deleteProduct(id: string): Promise<void> {
    await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  async getLowStockProducts(orgId?: string): Promise<Product[]> {
    return this.get<Product[]>("/inventory/low-stock");
  }

  async getExpiringProducts(orgId?: string): Promise<Product[]> {
    return this.get<Product[]>("/inventory/expiring");
  }

  // Customers
  async getCustomers(orgId?: string): Promise<Customer[]> {
    return this.get<Customer[]>("/customers");
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    return this.post<Customer>("/customers", customer);
  }

  async updateCustomer(
    id: string,
    customer: Partial<Customer>
  ): Promise<Customer> {
    return this.put<Customer>(`/customers/${id}`, customer);
  }

  async deleteCustomer(id: string): Promise<void> {
    await fetch(`${API_BASE}/customers/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  // Bills
  async getBills(orgId?: string): Promise<Bill[]> {
    return this.get<Bill[]>("/bills");
  }

  async getTodayBills(): Promise<Bill[]> {
    return this.get<Bill[]>("/bills/today");
  }

  async createBill(bill: Partial<Bill>): Promise<Bill> {
    return this.post<Bill>("/bills", bill);
  }

  async updateBill(id: string, bill: Partial<Bill>): Promise<Bill> {
    return this.put<Bill>(`/bills/${id}`, bill);
  }

  async deleteBill(id: string): Promise<void> {
    await fetch(`${API_BASE}/bills/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  async getBillItems(billId: string): Promise<BillItem[]> {
    return this.get<BillItem[]>(`/bills/${encodeURIComponent(billId)}/items`);
  }

  // Inventory
  async recordStockIn(
    orgId: string,
    data: { product_id: string; quantity: number }
  ): Promise<any> {
    return this.post(`/inventory/stock-in`, data);
  }

  async recordStockOut(
    orgId: string,
    data: { product_id: string; quantity: number }
  ): Promise<any> {
    return this.post(`/inventory/stock-out`, data);
  }

  async adjustStock(
    orgId: string,
    data: { product_id: string; delta: number; reason: string }
  ): Promise<any> {
    return this.post(`/inventory/adjust`, data);
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>("/dashboard/stats");
  }
}

export const api = new ApiClient();
