/**
 * Application Constants
 * Centralized storage for API endpoints, data arrays, and configuration
 */

// ============================================
// API ENDPOINTS
// ============================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/api/login",
    LOGOUT: "/api/logout",
    ME: "/api/me",
    REFRESH: "/api/refresh",
  },

  // Products & Inventory
  PRODUCTS: {
    LIST: "/api/products",
    SEARCH: "/api/products", // ?q={search}
    CREATE: "/api/products",
    UPDATE: (id: number) => `/api/products/${id}`,
    DELETE: (id: number) => `/api/products/${id}`,
    BY_BARCODE: "/api/products/barcode", // ?code={barcode}
    BY_QR: "/api/products/qr", // ?code={qr}
  },

  // Bills & Billing
  BILLS: {
    LIST: "/api/bills",
    CREATE: "/api/bills",
    GET: (id: number) => `/api/bills/${id}`,
    SEARCH: "/api/bills/search", // ?bill_number={number}
    UPDATE_STATUS: (id: number) => `/api/bills/${id}/status`,
    SEND_EBILL: "/api/bills/send-ebill",
  },

  // Customers
  CUSTOMERS: {
    LIST: "/api/customers",
    CREATE: "/api/customers",
    GET: (id: number) => `/api/customers/${id}`,
    UPDATE: (id: number) => `/api/customers/${id}`,
    DELETE: (id: number) => `/api/customers/${id}`,
    SEARCH: "/api/customers/search", // ?q={search}
  },

  // POS
  POS: {
    METRICS: "/api/pos/metrics",
    HELD_BILLS: "/api/held-bills",
    HELD_BILL: (id: number) => `/api/held-bills/${id}`,
    TERMINALS: "/api/pos/terminals",
    SHIFTS: "/api/pos/shifts",
    SHIFT_OPEN: "/api/pos/shifts/open",
    SHIFT_CLOSE: "/api/pos/shifts/close",
    CURRENT_SHIFT: "/api/pos/shifts/current",
  },

  // Returns & Refunds
  RETURNS: {
    LIST: "/api/returns",
    CREATE: "/api/returns",
    GET: (id: number) => `/api/returns/${id}`,
    UPDATE_STATUS: (id: number) => `/api/returns/${id}/status`,
  },

  // Analytics & Reports
  ANALYTICS: {
    OVERVIEW: "/api/analytics", // ?days={period}
    DASHBOARD_STATS: "/api/dashboard/stats",
    SALES_TREND: "/api/analytics/sales-trend",
    TOP_PRODUCTS: "/api/analytics/top-products",
  },

  // Users & Organizations
  USERS: {
    LIST: "/api/users",
    CREATE: "/api/users",
    UPDATE: (id: number) => `/api/users/${id}`,
    DELETE: (id: number) => `/api/users/${id}`,
    INVITE: "/api/users/invite",
  },

  // Stores
  STORES: {
    LIST: "/api/stores",
    CREATE: "/api/stores",
    GET: (id: number) => `/api/stores/${id}`,
    UPDATE: (id: number) => `/api/stores/${id}`,
  },

  // Payments
  PAYMENTS: {
    CREATE_ORDER: "/api/payments/create-order",
    VERIFY: "/api/payments/verify",
    RAZORPAY_CONFIG: "/api/payments/config",
  },
} as const;

// ============================================
// PAYMENT METHODS
// ============================================

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "Wallet" },
  { value: "card", label: "Card", icon: "CreditCard" },
  { value: "upi", label: "UPI", icon: "Smartphone" },
  { value: "credit", label: "Credit", icon: "DollarSign" },
] as const;

export type PaymentMethod = "cash" | "card" | "upi" | "credit";

// ============================================
// PAYMENT STATUS
// ============================================

export const PAYMENT_STATUS = [
  { value: "paid", label: "Paid", variant: "default" },
  { value: "pending", label: "Pending", variant: "secondary" },
  { value: "failed", label: "Failed", variant: "destructive" },
  { value: "refunded", label: "Refunded", variant: "outline" },
] as const;

export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

// ============================================
// REFUND METHODS
// ============================================

export const REFUND_METHODS = [
  { value: "cash", label: "Cash", icon: "Wallet" },
  { value: "card", label: "Card Reversal", icon: "CreditCard" },
  { value: "upi", label: "UPI Refund", icon: "Smartphone" },
  { value: "store_credit", label: "Store Credit", icon: "Gift" },
] as const;

export type RefundMethod = "cash" | "card" | "upi" | "store_credit";

// ============================================
// RETURN STATUS
// ============================================

export const RETURN_STATUS = [
  { value: "pending", label: "Pending", variant: "secondary" },
  { value: "completed", label: "Completed", variant: "default" },
  { value: "rejected", label: "Rejected", variant: "destructive" },
] as const;

export type ReturnStatus = "pending" | "completed" | "rejected";

// ============================================
// USER ROLES
// ============================================

export const USER_ROLES = [
  { value: "admin", label: "Admin", color: "red" },
  { value: "store_manager", label: "Store Manager", color: "blue" },
  { value: "inventory_manager", label: "Inventory Manager", color: "green" },
  { value: "cashier", label: "Cashier", color: "purple" },
  { value: "viewer", label: "Viewer", color: "gray" },
] as const;

export type UserRole =
  | "admin"
  | "store_manager"
  | "inventory_manager"
  | "cashier"
  | "viewer";

// ============================================
// PRODUCT CATEGORIES
// ============================================

export const PRODUCT_CATEGORIES = [
  "Groceries",
  "Dairy",
  "Beverages",
  "Snacks",
  "Personal Care",
  "Household",
  "Frozen Foods",
  "Bakery",
  "Fruits & Vegetables",
  "Meat & Seafood",
  "Other",
] as const;

// ============================================
// STOCK STATUS
// ============================================

export const STOCK_STATUS = {
  IN_STOCK: { label: "In Stock", color: "green", threshold: 10 },
  LOW_STOCK: { label: "Low Stock", color: "yellow", threshold: 5 },
  OUT_OF_STOCK: { label: "Out of Stock", color: "red", threshold: 0 },
} as const;

// ============================================
// REPORT PERIODS
// ============================================

export const REPORT_PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last year" },
] as const;

// ============================================
// CHART COLORS
// ============================================

export const CHART_COLORS = [
  "#f97316", // orange-600
  "#3b82f6", // blue-600
  "#10b981", // green-600
  "#eab308", // yellow-600
  "#8b5cf6", // purple-600
  "#ec4899", // pink-600
  "#06b6d4", // cyan-600
  "#f59e0b", // amber-600
  "#14b8a6", // teal-600
  "#f43f5e", // rose-600
] as const;

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

export const KEYBOARD_SHORTCUTS = {
  QUICK_POS: {
    SEARCH: "F1",
    CLEAR_CART: "F2",
    HOLD_BILL: "F3",
    COMPLETE_SALE: "F4",
    SPLIT_PAYMENT: "F5",
    CUSTOMER_SELECT: "F6",
    BARCODE_SCAN: "Enter",
  },
  GLOBAL: {
    SEARCH: "Ctrl+K",
    NEW_BILL: "Ctrl+B",
    NEW_PRODUCT: "Ctrl+P",
    LOGOUT: "Ctrl+Shift+L",
  },
} as const;

// ============================================
// QUICK SPLIT RATIOS
// ============================================

export const QUICK_SPLIT_RATIOS = [
  { label: "50/50", ratio: [1, 1], description: "Equal split" },
  { label: "66/33", ratio: [2, 1], description: "Two-thirds / one-third" },
  {
    label: "75/25",
    ratio: [3, 1],
    description: "Three-quarters / one-quarter",
  },
  { label: "3-Way", ratio: [1, 1, 1], description: "Equal three-way split" },
] as const;

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION = {
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^[0-9+\-\s()]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },
  BARCODE: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 13,
  },
  BILL_NUMBER: {
    PATTERN: /^BILL-\d{4}-\d{3,}$/,
  },
} as const;

// ============================================
// DATE FORMATS
// ============================================

export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  DISPLAY_WITH_TIME: "MMM dd, yyyy HH:mm",
  FULL: "MMMM dd, yyyy hh:mm a",
  ISO: "yyyy-MM-dd",
  TIME_ONLY: "HH:mm",
} as const;

// ============================================
// CURRENCY
// ============================================

export const CURRENCY = {
  CODE: "INR",
  SYMBOL: "₹",
  LOCALE: "en-IN",
  DECIMAL_PLACES: 2,
} as const;

// ============================================
// OFFLINE QUEUE
// ============================================

export const OFFLINE_QUEUE_CONFIG = {
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 5,
  CLEANUP_AFTER_DAYS: 30,
  DB_NAME: "pantrypal_offline",
  DB_VERSION: 1,
  STORE_NAME: "bills_queue",
} as const;

// ============================================
// THERMAL PRINTER
// ============================================

export const THERMAL_PRINTER_CONFIG = {
  PAPER_WIDTH_MM: 80,
  CHAR_PER_LINE: 42,
  FONT_SIZE: 12,
  ESC: "\x1b",
  GS: "\x1d",
} as const;

// ============================================
// E-BILL CONFIG
// ============================================

export const EBILL_CONFIG = {
  QR_SIZE: 300, // pixels
  QR_ERROR_CORRECTION: "M" as const, // L, M, Q, H
  SUPPORTED_CHANNELS: ["email", "sms", "whatsapp"] as const,
  MAX_FILE_SIZE_MB: 5,
} as const;

export type EBillChannel = "email" | "sms" | "whatsapp";

// ============================================
// FILE UPLOAD
// ============================================

export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "application/msword"],
} as const;

// ============================================
// TOAST DURATIONS
// ============================================

export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export const formatCurrency = (amount: number): string => {
  return `${CURRENCY.SYMBOL}${amount.toLocaleString(CURRENCY.LOCALE, {
    minimumFractionDigits: CURRENCY.DECIMAL_PLACES,
    maximumFractionDigits: CURRENCY.DECIMAL_PLACES,
  })}`;
};

export const formatDate = (
  date: Date | string,
  format: keyof typeof DATE_FORMATS = "DISPLAY_WITH_TIME",
): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(CURRENCY.LOCALE, {
    year: "numeric",
    month: format.includes("FULL") ? "long" : "short",
    day: "numeric",
    hour: format.includes("TIME") ? "2-digit" : undefined,
    minute: format.includes("TIME") ? "2-digit" : undefined,
  });
};

export const getStockStatus = (quantity: number) => {
  if (quantity === 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= STOCK_STATUS.LOW_STOCK.threshold)
    return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
};
