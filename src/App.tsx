import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import React, { useMemo } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import Layout from './components/Layout';
import PushNotificationInitializer from './components/PushNotificationInitializer';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import CustomerOrderPage from './pages/customer/CustomerOrderPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import TableBookingPage from './pages/customer/TableBookingPage';
import DashboardPage from './pages/DashboardPage';
import GuestPOSPage from './pages/guest/GuestPOSPage';
import InventoryPage from './pages/inventory/InventoryPage';
import WasteManagementPage from './pages/inventory/WasteManagementPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import KitchenInterface from './pages/kitchen/KitchenInterface';
import KitchenOrdersPage from './pages/kitchen/KitchenOrdersPage';
import MenuPage from './pages/menu/MenuPage';
import TraysPage from './pages/menu/TraysPage';

import OrdersPage from './pages/orders/OrdersPage';
import POSPage from './pages/pos/POSPage';
import ProfilePage from './pages/profile/ProfilePage';
import FeedbackPage from './pages/public/FeedbackPage';
import HomePage from './pages/public/HomePage';
import CreatePOPage from './pages/purchase-orders/CreatePOPage';
import PurchaseOrderDetailPage from './pages/purchase-orders/PurchaseOrderDetailPage';
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage';
import CreateRecipePage from './pages/recipes/CreateRecipePage';
import RecipesPage from './pages/recipes/RecipesPage';
import ReportsPage from './pages/reports/ReportsPage';
import RestaurantRegisterPage from './pages/RestaurantRegisterPage';
import SettingsPage from './pages/settings/SettingsPage';
import SubscriptionCancel from './pages/subscription/SubscriptionCancel';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import SubscriptionSuccess from './pages/subscription/SubscriptionSuccess';
import AdminSupportPage from './pages/support/AdminSupportPage';
import TablesPage from './pages/tables/TablesPage';
import UsersPage from './pages/users/UsersPage';
import { getTheme } from './theme/theme';

// ---- NEW IMPORTS FOR ADMIN SECTION ----
import { RequireFeature } from './components/RequireFeature';
import { RequireRole } from './components/RequireRole';
import CouponsAdminPage from './pages/admin/CouponsAdminPage';
import PromoCodePage from './pages/admin/PromoCodePage';
import { Unauthorized } from './pages/Unauthorized';
// import UsersAdminPage from './pages/admin/UsersAdminPage';
// import SettingsAdminPage from './pages/admin/SettingsAdminPage';
import { Toaster } from 'react-hot-toast';
import SuperAdminLayout from './components/SuperAdminLayout';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import BookingsAdminPage from './pages/admin/BookingsAdminPage';
import CateringCommissionsPage from './pages/admin/catering/CateringCommissionsPage';
import CateringManagementPage from './pages/admin/catering/CateringManagementPage';
import AttendancePage from './pages/AttendancePage';
import CateringPage from './pages/catering/CateringPage';
import CateringTrackPage from './pages/customer/CateringTrackPage';
import CustomersPage from './pages/customers/CustomersPage';
import InvoicesAdminPage from './pages/superadmin/InvoicesAdminPage';
import PlansPage from './pages/superadmin/PlansPage';
import SuperAdminPortal from './pages/superadmin/SuperAdminPortal';
import TenantsPage from './pages/superadmin/TenantsPage';
import TicketsPage from './pages/superadmin/TicketsPage';
import VendorsPage from './pages/vendors/VendorsPage';


import { SettingsProvider, useSettings } from './context/SettingsContext';

import CustomerRegisterPage from './pages/auth/CustomerRegisterPage';

const ThemedAppContent: React.FC = () => {
  const { settings } = useSettings();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const mode = useMemo(() => {
    if (settings.system.theme === 'dark') return 'dark';
    if (settings.system.theme === 'light') return 'light';
    return prefersDarkMode ? 'dark' : 'light';
  }, [settings.system.theme, prefersDarkMode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <NotificationProvider>
        <SocketProvider>
          <PushNotificationInitializer />
          <Routes>
            {/* Public routes (no layout, no slug) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RestaurantRegisterPage />} />

            {/* ---- SUPERADMIN ROUTES ---- */}
            <Route element={<RequireRole allowedRoles={["superadmin"]} />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/superadmin" element={<SuperAdminPortal />} />
                <Route path="/superadmin/tenants" element={<TenantsPage />} />
                <Route path="/superadmin/plans" element={<PlansPage />} />
                <Route path="/superadmin/invoices" element={<InvoicesAdminPage />} />
                <Route path="/superadmin/tickets" element={<TicketsPage />} />
              </Route>
            </Route>

            {/* ---- ADMIN‑ONLY ROUTES ---- */}
            <Route element={<RequireRole allowedRoles={["admin"]} />}>
              {/* Admin-only routes can be added here if needed */}
            </Route>

            {/* ---- TENANT ROUTES ---- */}
            <Route path="/:slug">
              <Route index element={<GuestPOSPage />} />
              <Route path="register" element={<CustomerRegisterPage />} />
              <Route path="feedback/:orderId" element={<FeedbackPage />} />

              {/* ─── Customer Routes (No Sidebar, Single Page Layout) ─── */}
              <Route element={<CustomerLayout />}>
                <Route path="customer/order" element={<CustomerOrderPage />} />
                <Route path="customer/book-table" element={<TableBookingPage />} />
                <Route path="customer/bookings" element={<MyBookingsPage />} />
                {/* Guest-accessible customer catering routes */}
                <Route element={<RequireFeature feature="catering" guestAllowed />}>
                  <Route path="customer/catering" element={<CateringPage />} />
                  <Route path="customer/catering/track/:id" element={<CateringTrackPage />} />
                </Route>
              </Route>

              {/* ─── Admin/Staff Routes (With Sidebar Layout) ─── */}
              <Route element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="pos" element={<POSPage />} />
                <Route element={<RequireRole allowedRoles={['admin', 'manager']} />}>
                  <Route path="menu" element={<MenuPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/waste" element={<WasteManagementPage />} />
                  <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="purchase-orders/create" element={<CreatePOPage />} />
                  <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="recipes" element={<RecipesPage />} />
                  <Route path="recipes/create" element={<CreateRecipePage />} />
                  <Route path="recipes/:id/edit" element={<CreateRecipePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="promocode" element={<PromoCodePage />} />
                  <Route path="coupons" element={< CouponsAdminPage/>} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="bookings" element={<BookingsAdminPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                </Route>

                <Route element={<RequireRole allowedRoles={['admin', 'superadmin']} />}>
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                </Route>

                <Route element={<RequireRole allowedRoles={['admin']} />}>
                  <Route path="subscription" element={<SubscriptionPage />} />
                  <Route path="subscription/success" element={<SubscriptionSuccess />} />
                  <Route path="subscription/cancel" element={<SubscriptionCancel />} />
                </Route>

                <Route element={<RequireRole allowedRoles={['admin', 'manager', 'waiter', 'cashier']} />}>
                  <Route path="tables" element={<TablesPage />} />
                </Route>

                <Route path="profile" element={<ProfilePage />} />

                {/* Kitchen Routes */}
                <Route element={<RequireRole allowedRoles={['admin', 'manager', 'kitchen_staff']} />}>
                  <Route path="kitchen" element={<KitchenInterface />} />
                  <Route path="kot" element={<KitchenOrdersPage />} />
                </Route>

                {/* Protected admin catering routes */}
                <Route element={<RequireFeature feature="catering" />}>
                  <Route path="catering-admin" element={<CateringManagementPage />} />
                  <Route path="catering-commissions" element={<CateringCommissionsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback for old routes without slug - redirect to login */}
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/users" element={<Navigate to="/login" replace />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </NotificationProvider>
    </ThemeProvider >
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <ThemedAppContent />
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
