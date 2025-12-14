import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tantml:react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InviteAccept from "./pages/InviteAccept";
import OrgInvite from "./pages/OrgInvite";
import Inventory from "./pages/Inventory";
import AddProduct from "./pages/AddProduct";
import Billing from "./pages/Billing";
import NewBill from "./pages/NewBill";
import QRScanner from "./pages/QRScanner";
import BarcodeScanner from "./pages/BarcodeScanner";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite/accept" element={<InviteAccept />} />
            <Route path="/org/invite" element={<OrgInvite />} />

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

            {/* QR Scanner - Old version */}
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

            {/* Barcode Scanner - New professional version */}
            <Route
              path="/barcode-scanner"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BarcodeScanner />
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
              path="/expiry-alerts"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ExpiryAlerts />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin only - User Management */}
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Profile page accessible to all authenticated users */}
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

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
