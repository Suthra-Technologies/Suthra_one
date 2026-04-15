import { Box, Button, CircularProgress, CssBaseline, Paper, ThemeProvider, Typography, useMediaQuery } from '@mui/material';
import React, { useMemo } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useParams, useLocation } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import Layout from './components/Layout';
import PushNotificationInitializer from './components/PushNotificationInitializer';
import { getTenantSlugFromHostname } from './utils/tenant.utils';
import { TenantRoutes } from './routes/TenantRoutes';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import CustomerOrderPage from './pages/customer/CustomerOrderPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import TableBookingPage from './pages/customer/TableBookingPage';
import CheckoutPage from './pages/CheckoutPage';
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
import CustomerSupportPage from './pages/support/CustomerSupportPage';
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
import CustomiseScreensPage from './pages/admin/customise-screens/CustomiseScreensPage';
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
import { GuestCartProvider } from './context/GuestCartContext';

// Error Boundary Component to prevent white screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Crash Logged:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', p: 3, textAlign: 'center', bgcolor: '#fdf2f2' }}>
          <Typography variant="h4" color="error" fontWeight="bold" gutterBottom>System Error</Typography>
          <Typography variant="body1" sx={{ mb: 4, maxWidth: 500 }}>The application encountered an unexpected error. This is usually caused by a data mismatch from the server.</Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: '#fff', maxWidth: '90%', overflow: 'auto' }}>
            <Typography variant="caption" component="pre" sx={{ textAlign: 'left', color: '#d32f2f' }}>
              {this.state.error?.toString()}
            </Typography>
          </Paper>
          <Button variant="contained" onClick={() => window.location.reload()}>Reload Application</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ThemedAppContent: React.FC = () => {
  const { settings } = useSettings();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const mode = useMemo(() => {
    if (!settings || !settings.system) return prefersDarkMode ? 'dark' : 'light';
    if (settings.system.theme === 'dark') return 'dark';
    if (settings.system.theme === 'light') return 'light';
    return prefersDarkMode ? 'dark' : 'light';
  }, [settings?.system?.theme, prefersDarkMode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <NotificationProvider>
        <SocketProvider>
          <PushNotificationInitializer />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </SocketProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

const AppRoutes: React.FC = () => {
  const hostnameSlug = getTenantSlugFromHostname();

  return (
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

      {/* ---- SUBDOMAIN TENANT ROUTES (Root level) ---- */}
      {hostnameSlug && (
        <>
          {TenantRoutes()}
          {/* Redirect from /mythri/dashboard to /dashboard if on mythri.localhost */}
          <Route path="/:slug/*" element={<SubdomainRedirect contextSlug={hostnameSlug} />} />
        </>
      )}

      {/* ---- PATH-BASED TENANT ROUTES ---- */}
      {!hostnameSlug && (
        <Route path="/:slug">
          {TenantRoutes()}
        </Route>
      )}

      {/* Fallback for old routes without slug - redirect to login */}
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      <Route path="/users" element={<Navigate to="/login" replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <GuestCartProvider>
            <ThemedAppContent />
          </GuestCartProvider>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
};

/**
 * Helper component to handle redirects when a slug is present in the path 
 * but the user is already on a tenant subdomain.
 * e.g. mythri.localhost/mythri/menu -> mythri.localhost/menu
 */
const SubdomainRedirect: React.FC<{ contextSlug: string }> = ({ contextSlug }) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  const redirectContent = (path: string) => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      bgcolor: '#f8f9fa' 
    }}>
      <CircularProgress size={40} sx={{ mb: 2, color: '#4F46E5' }} />
      <Typography variant="body2" color="text.secondary" fontWeight="medium">
        Redirecting...
      </Typography>
      <Navigate to={path} replace />
    </Box>
  );

  if (slug === contextSlug) {
    // Remove the slug from the path but preserve query parameters
    const newPath = (location.pathname.replace(`/${slug}`, '') || '/') + location.search;
    return redirectContent(newPath);
  }

  // If the slug doesn't match the subdomain, fallback redirect
  const fallbackPath = "/" + location.search;
  return redirectContent(fallbackPath);
};

export default App;
