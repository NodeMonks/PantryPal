import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SyncStatus } from "./components/SyncStatus";
import Index from "./pages/Index";
import Login from "./pages/Login";
import InviteAccept from "./pages/InviteAccept";
import OrgInvite from "./pages/OrgInvite";
import Inventory from "./pages/Inventory";
import AddProduct from "./pages/AddProduct";
import Billing from "./pages/Billing";
import NewBill from "./pages/NewBill";
import QRScanner from "./pages/QRScanner";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import BarcodeScannerPhysical from "./pages/BarcodeScannerPhysical";
import Subscription from "./pages/Subscription";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import QuickPOS from "./pages/QuickPOS";
import POSDashboard from "./pages/POSDashboard";
import ReturnsRefunds from "./pages/ReturnsRefunds";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SyncStatus />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/invite/accept" element={<InviteAccept />} />
            <Route path="/org/invite" element={<OrgInvite />} />
            <Route path="/subscribe" element={<Subscription />} />

            {/* Protected Routes - Dashboard is accessible by all authenticated users */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Inventory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin and Manager only - Add/Edit Products */}
            <Route
              path="/inventory/add"
              element={
                <ProtectedRoute roles={["admin", "store_manager"]}>
                  <DashboardLayout>
                    <AddProduct />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Inventory Manager, Store Manager, Admin - Billing */}
            <Route
              path="/billing"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <Billing />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/billing/new"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <NewBill />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/qr-scanner"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <QRScanner />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/barcode-scanner"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BarcodeScannerPhysical />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Checkout Flow - Accessible to staff who can create bills */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <Checkout />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Quick POS - Fast single-screen checkout */}
            <Route
              path="/quick-pos"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <QuickPOS />
                </ProtectedRoute>
              }
            />

            {/* POS Dashboard - Real-time metrics */}
            <Route
              path="/pos-dashboard"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <POSDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/order-confirmation/:billId"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <OrderConfirmation />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Inventory Manager, Store Manager, Admin - Customers */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute
                  roles={["admin", "store_manager", "inventory_manager"]}
                >
                  <DashboardLayout>
                    <Customers />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/returns"
              element={
                <ProtectedRoute roles={["admin", "store_manager"]}>
                  <DashboardLayout>
                    <ReturnsRefunds />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/expiry"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ExpiryAlerts />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin & Store Manager - User Management */}
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["admin", "store_manager"]}>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
