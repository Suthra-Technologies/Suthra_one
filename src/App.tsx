import { Capacitor, registerPlugin } from '@capacitor/core';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Box, Button, CircularProgress, CssBaseline, Paper, ThemeProvider, Typography, useMediaQuery } from '@mui/material';
import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import PushNotificationInitializer from './components/PushNotificationInitializer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { TenantRoutes } from './routes/TenantRoutes';
import { getTenantSlugFromHostname } from './utils/tenant.utils';
import { planFeaturesOf, resolveLandingPath } from './utils/landingPath';

import HomePage from './pages/public/HomePage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import GoogleAuthRelayPage from './pages/public/GoogleAuthRelayPage';
import RescheduleDemoPage from './pages/public/RescheduleDemoPage';
import TermsConditionsPage from './pages/public/TermsConditionsPage';
import RestaurantRegisterPage from './pages/RestaurantRegisterPage';
import SubscriptionCancel from './pages/subscription/SubscriptionCancel';
import SubscriptionSuccess from './pages/subscription/SubscriptionSuccess';
import { getTheme } from './theme/theme';

// ---- NEW IMPORTS FOR ADMIN SECTION ----
import { RequireRole } from './components/RequireRole';
import { Unauthorized } from './pages/Unauthorized';
// import UsersAdminPage from './pages/admin/UsersAdminPage';
// import SettingsAdminPage from './pages/admin/SettingsAdminPage';
import { Toaster } from 'react-hot-toast';
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminLogsPage from './pages/superadmin/AdminLogsPage';
import DeliveryReportsPage from './pages/superadmin/DeliveryReportsPage';
import DemoRequestsLogPage from './pages/superadmin/DemoRequestsLogPage';
import DemoRequestsPage from './pages/superadmin/DemoRequestsPage';
import EmailLogsDetailPage from './pages/superadmin/EmailLogsDetailPage';
import EmailOverviewPage from './pages/superadmin/EmailOverviewPage';
import InvoicesAdminPage from './pages/superadmin/InvoicesAdminPage';
import MaterialProvidersPage from './pages/superadmin/MaterialProvidersPage';
import PlansLogPage from './pages/superadmin/PlansLogPage';
import PlansPage from './pages/superadmin/PlansPage';
import SuperAdminProfilePage from './pages/superadmin/SuperAdminProfilePage';
import SuperAdminSettingsPage from './pages/superadmin/SettingsPage';
import SmsLogsDetailPage from './pages/superadmin/SmsLogsDetailPage';
import SmsOverviewPage from './pages/superadmin/SmsOverviewPage';
import StoresLogPage from './pages/superadmin/StoresLogPage';
import SuperAdminPortal from './pages/superadmin/SuperAdminPortal';
import SuperAdminTeamPage from './pages/superadmin/SuperAdminTeamPage';
import ActivityOverviewPage from './pages/superadmin/ActivityOverviewPage';
import TenantDetailsPage from './pages/superadmin/TenantDetailsPage';
import TenantOrdersPage from './pages/superadmin/TenantOrdersPage';
import TenantPaymentsPage from './pages/superadmin/TenantPaymentsPage';
import TenantsPage from './pages/superadmin/TenantsPage';
import TicketsLogPage from './pages/superadmin/TicketsLogPage';
import TicketsPage from './pages/superadmin/TicketsPage';
import UberDirectPage from './pages/superadmin/UberDirectPage';

import { BrandProvider, useBrand } from './context/BrandContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';


import { GuestCartProvider } from './context/GuestCartContext';
import CustomerRegisterPage from './pages/auth/CustomerRegisterPage';

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
  const { branding } = useBrand();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const mode = useMemo(() => {
    if (!settings || !settings.system) return prefersDarkMode ? 'dark' : 'light';
    if (settings.system.theme === 'dark') return 'dark';
    if (settings.system.theme === 'light') return 'light';
    return prefersDarkMode ? 'dark' : 'light';
  }, [settings?.system?.theme, prefersDarkMode]);

  // Re-build theme whenever brand colors OR light/dark mode changes.
  // BRAND_CONFIG is statically imported, but branding.primaryColor may be
  // overridden at runtime by BrandContext after the API call resolves.
  const theme = useMemo(() => {
    // Temporarily patch CSS variables so getMUI theme picks up the right shade
    // (MUI theme uses BRAND_CONFIG directly; runtime override is via CSS vars)
    return getTheme(mode);
  }, [mode, branding.primaryColor, branding.secondaryColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000 }}
        containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
      />
      <NotificationProvider>
        <ErrorBoundary>
          <SocketProvider>
            <PushNotificationInitializer />
            <AppRoutes />
          </SocketProvider>
        </ErrorBoundary>
      </NotificationProvider>
    </ThemeProvider>
  );
};

const AppPlugin = registerPlugin<any>('App');

/** The back handler runs outside AuthContext, so read the persisted user. */
const readStoredUser = (): any => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const MobileBackHandler: React.FC = () => {
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;
    const setupListener = async () => {
      listenerHandle = await AppPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        const currentPath = location.pathname;
        const storedTenantSlug = localStorage.getItem('tenantSlug');
        const isAuthScreen = ['/login', '/reset-password', '/register', '/customer-register'].some((path) => currentPath === path || currentPath.startsWith(`${path}/`));
        // Home is whatever this role can actually open, not always Dashboard.
        const storedUser = readStoredUser();
        const home = resolveLandingPath(
          localStorage.getItem('activeRole'),
          planFeaturesOf(storedUser),
        );
        const defaultPath = storedTenantSlug ? `/${storedTenantSlug}${home}` : home;

        // If we have browser history, go back within app.
        if (canGoBack && !isAuthScreen) {
          window.history.back();
          return;
        }

        // If no history, route to dashboard instead of closing app.
        if (currentPath !== defaultPath) {
          window.location.href = defaultPath;
          return;
        }

        // At dashboard root: keep app open (do not exit automatically).
      });
    };

    setupListener();
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isNative, location.pathname]);

  return null;
};

const AppRoutes: React.FC = () => {
  const { user, activeRole, isAuthenticated } = useAuth();
  const hostnameSlug = getTenantSlugFromHostname();
  const isNative = Capacitor.isNativePlatform();
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  const storedTenantSlug = typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null;

  // Use user context if available, fallback to localStorage for initial render/handover
  const role = activeRole || (typeof window !== 'undefined' ? localStorage.getItem('activeRole') : null);
  const isSuperAdmin = role === 'superadmin';

  // Land on the first page this role can open under the tenant's plan —
  // Dashboard is not available to every role, and gating it by plan is fine,
  // but sending the user there regardless produced an /unauthorized bounce.
  const landingPath = resolveLandingPath(role, planFeaturesOf(user));

  const defaultAuthedPath = isSuperAdmin
    ? '/superadmin'
    : (hostnameSlug ? landingPath : (storedTenantSlug ? `/${storedTenantSlug}${landingPath}` : landingPath));

  const hasStoredSession = isAuthenticated || !!storedToken;
  console.log('AppRoutes: Rendering. Token present:', hasStoredSession, 'Role:', role, 'Tenant:', storedTenantSlug, 'AuthedPath:', defaultAuthedPath);

  return (
    <Routes>
      {/* Public routes (no layout, no slug) */}
      <Route path="/" element={hasStoredSession ? <Navigate to={defaultAuthedPath} replace /> : (isNative ? <Navigate to="/login" replace /> : <HomePage />)} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/google-auth-relay" element={<GoogleAuthRelayPage />} />
      <Route path="/terms-and-conditions" element={<TermsConditionsPage />} />
      <Route path="/reschedule-demo/:token" element={<RescheduleDemoPage />} />
      <Route path="/login" element={hasStoredSession ? <Navigate to={defaultAuthedPath} replace /> : <LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {!hostnameSlug && <Route path="/register" element={<RestaurantRegisterPage />} />}
      <Route path="/customer-register" element={<CustomerRegisterPage />} />
      <Route path="/registration-success" element={<SubscriptionSuccess />} />
      <Route path="/registration-failed" element={<SubscriptionCancel />} />

      {/* ---- SUPERADMIN ROUTES ---- */}
      <Route element={<RequireRole allowedRoles={["superadmin"]} />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/superadmin" element={<SuperAdminPortal />} />
          <Route path="/superadmin/tenants" element={<TenantsPage />} />
          <Route path="/superadmin/tenants/:tenantId" element={<TenantDetailsPage />} />
          <Route path="/superadmin/tenants/:tenantId/platform-payments" element={<TenantPaymentsPage />} />
          <Route path="/superadmin/tenants/:tenantId/orders" element={<TenantOrdersPage />} />
          <Route path="/superadmin/plans" element={<PlansPage />} />
          <Route path="/superadmin/invoices" element={<InvoicesAdminPage />} />
          <Route path="/superadmin/tickets" element={<TicketsPage />} />
          <Route path="/superadmin/delivery-reports" element={<DeliveryReportsPage />} />
          <Route path="/superadmin/demo-requests" element={<DemoRequestsPage />} />
          <Route path="/superadmin/sms-logs" element={<SmsOverviewPage />} />
          <Route path="/superadmin/sms-logs/:tenantId" element={<SmsLogsDetailPage />} />
          <Route path="/superadmin/email-logs" element={<EmailOverviewPage />} />
          <Route path="/superadmin/email-logs/:tenantId" element={<EmailLogsDetailPage />} />
          <Route path="/superadmin/uber-direct" element={<UberDirectPage />} />
          <Route path="/superadmin/logs/stores" element={<StoresLogPage />} />
          <Route path="/superadmin/logs/plans" element={<PlansLogPage />} />
          <Route path="/superadmin/logs/demo-requests" element={<DemoRequestsLogPage />} />
          <Route path="/superadmin/logs/tickets" element={<TicketsLogPage />} />
          <Route path="/superadmin/admin-logs" element={<AdminLogsPage />} />
          <Route path="/superadmin/activity" element={<ActivityOverviewPage />} />
          <Route path="/superadmin/profile" element={<SuperAdminProfilePage />} />
          <Route path="/superadmin/settings" element={<SuperAdminSettingsPage />} />
          <Route path="/superadmin/team" element={<SuperAdminTeamPage />} />
          <Route path="/superadmin/material-providers" element={<MaterialProvidersPage />} />
        </Route>
      </Route>

      {/* ---- SUBDOMAIN TENANT ROUTES (Root level) ---- */}
      {hostnameSlug && (
        <>
          {TenantRoutes()}
          {/* Redirect from /mythri/dashboard to /dashboard if on mythri.localhost */}
          <Route path={`/${hostnameSlug}/*`} element={<SubdomainRedirect contextSlug={hostnameSlug} />} />
        </>
      )}

      {/* ---- PATH-BASED TENANT ROUTES ---- */}
      {!hostnameSlug && (
        <Route path="/:slug">
          {TenantRoutes()}
        </Route>
      )}

      {/* Fallback for old routes without slug - redirect to login or default authed path */}
      {/* No slug in the URL. defaultAuthedPath resolves to a page this user can
          open; only fall through to /unauthorized if that would loop back here. */}
      <Route path="/dashboard" element={<Navigate to={hasStoredSession ? (defaultAuthedPath === '/dashboard' ? '/unauthorized' : defaultAuthedPath) : '/login'} replace />} />
      <Route path="/users" element={<Navigate to={hasStoredSession ? defaultAuthedPath : '/login'} replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to={hasStoredSession ? defaultAuthedPath : '/login'} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  // Detect the tenant slug from the hostname (e.g. mythri.localhost → "mythri")
  // BrandProvider uses this to fetch runtime branding from /tenants/:slug/branding
  const tenantSlug = getTenantSlugFromHostname() || undefined;

  useEffect(() => {
    (async function() {
      try {
        if (!Capacitor.isNativePlatform()) return;
        if (Capacitor.getPlatform() === 'android') {
          await SafeArea.setImmersiveNavigationBar();
        }
        const safeAreaData = await SafeArea.getSafeAreaInsets();
        const {insets} = safeAreaData;
        for (const [key, value] of Object.entries(insets)) {
            document.documentElement.style.setProperty(
                `--safe-area-inset-${key}`,
                `${value}px`,
            );
        }
        await SafeArea.addListener('safeAreaChanged', data => {
          const { insets } = data;
          for (const [key, value] of Object.entries(insets)) {
            document.documentElement.style.setProperty(
              `--safe-area-inset-${key}`,
              `${value}px`,
            );
          }
        });
      } catch (e) {
        console.error("SafeArea Error", e);
      }
    })();
  }, []);

  return (
    <Router>
      <BrandProvider tenantSlug={tenantSlug}>
        <AuthProvider>
          <SettingsProvider>
            <GuestCartProvider>
              <MobileBackHandler />
              <ThemedAppContent />
            </GuestCartProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrandProvider>
    </Router>
  );
};

/**
 * Helper component to handle redirects when a slug is present in the path 
 * but the user is already on a tenant subdomain.
 * e.g. mythri.localhost/mythri/menu -> mythri.localhost/menu
 */
const SubdomainRedirect: React.FC<{ contextSlug: string }> = ({ contextSlug }) => {
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

  // Remove the slug from the path but preserve query parameters
  const newPath = (location.pathname.replace(`/${contextSlug}`, '') || '/') + location.search;
  return redirectContent(newPath);
};

export default App;
