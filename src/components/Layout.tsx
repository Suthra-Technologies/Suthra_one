import {
  Add,
  CancelOutlined,
  CheckCircleOutline,
  ChevronLeft,
  ChevronRight,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  TextField,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import type { MouseEvent, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useAuth } from 'src/context/AuthContext';
import { useNotifications } from 'src/context/NotificationProvider';
import { useSettings } from 'src/context/SettingsContext';
import { settingsAPI, tenantAPI } from 'src/services/api';
import AddRestaurantDialog from './AddRestaurantDialog';
import NotificationPanel from './NotificationPanel';
import ShiftManager from './ShiftManager';
import Sidebar from './Sidebar';
import SubscriptionBanner from './SubscriptionBanner';
import SubscriptionStatus from './SubscriptionStatus';

const DRAWER_WIDTH_EXPANDED = 280;
const DRAWER_WIDTH_COLLAPSED = 72;

// ── Restaurant Open/Close Toggle ──────────────────────────────────────────────
const RestaurantStatusToggle: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [autoIsOpen, setAutoIsOpen] = useState<boolean | null>(null); // schedule-driven
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenOption, setReopenOption] = useState<string>('1_hour');
  const [customReopenTime, setCustomReopenTime] = useState<string>('');
  const [closeReason, setCloseReason] = useState('');
  const [customerMessage, setCustomerMessage] = useState('We are temporarily closed. Pre-orders for later slots are still open.');

  const { tenantSlug } = useAuth() as any;

  const loadStatus = React.useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const [manualRes, hoursRes] = await Promise.all([
        tenantAPI.getRestaurantStatus(tenantSlug),
        settingsAPI.getPublicHours(tenantSlug),
      ]);

      const manualIsOpen = manualRes.data?.isOpen !== false;
      const lastStatusChangedAt = manualRes.data?.lastStatusChangedAt;
      const autoIsOpen = hoursRes.data?.autoIsOpen !== false;
      const timezone = hoursRes.data?.timezone || 'America/New_York';

      let effectiveIsOpen = autoIsOpen;
      
      if (lastStatusChangedAt) {
        try {
          const now = new Date();
          const tzNowStr = now.toLocaleString('en-US', { timeZone: timezone });
          const tzChangedStr = new Date(lastStatusChangedAt).toLocaleString('en-US', { timeZone: timezone });
          
          if (tzNowStr.split(',')[0] === tzChangedStr.split(',')[0]) {
            effectiveIsOpen = manualIsOpen;
          }
        } catch {}
      } else {
        effectiveIsOpen = autoIsOpen ? manualIsOpen : false;
      }

      setIsOpen(effectiveIsOpen);
      setAutoIsOpen(autoIsOpen);
    } catch {
      setIsOpen(true);
      setAutoIsOpen(true);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConfirm = async () => {
    if (isOpen) {
      if (reopenOption === 'custom' && !customReopenTime) {
        toast.error('Please specify a custom reopen time');
        return;
      }
    }

    setConfirmOpen(false);
    setSaving(true);
    try {
      const next = !isOpen;

      let reopenAt: string | undefined = undefined;

      if (next === false) { // Closing
        const now = new Date();
        if (reopenOption === '30_min') {
          now.setMinutes(now.getMinutes() + 30);
          reopenAt = now.toISOString();
        } else if (reopenOption === '1_hour') {
          now.setHours(now.getHours() + 1);
          reopenAt = now.toISOString();
        } else if (reopenOption === '2_hour') {
          now.setHours(now.getHours() + 2);
          reopenAt = now.toISOString();
        } else if (reopenOption === 'tomorrow') {
          now.setDate(now.getDate() + 1);
          now.setHours(9, 0, 0, 0); // Approx 9am for tomorrow
          reopenAt = now.toISOString();
        } else if (reopenOption === 'custom' && customReopenTime) {
          const [hh, mm] = customReopenTime.split(':').map(Number);
          const customDate = new Date();
          customDate.setHours(hh, mm, 0, 0);
          if (customDate <= new Date()) {
            customDate.setDate(customDate.getDate() + 1);
          }
          reopenAt = customDate.toISOString();
        }
      }

      await tenantAPI.updateRestaurantStatus({
        isOpen: next,
        ...(next === false ? {
          reopenAt,
          closeReason: closeReason.trim() || undefined,
          customerMessage: customerMessage.trim() || undefined
        } : {})
      });
      setIsOpen(next);
      toast.success(`Restaurant is now ${next ? '🟢 OPEN' : '🔴 CLOSED'}`);
    } catch {
      toast.error('Failed to update restaurant status');
    } finally {
      setSaving(false);
    }
  };

  if (isOpen === null) {
    return <CircularProgress size={18} sx={{ mx: 1, color: 'text.secondary' }} />;
  }

  // Show orange when manually overriding the schedule
  const isOverride = autoIsOpen !== null && autoIsOpen !== isOpen;
  const chipColor = saving ? 'grey.400' : isOverride ? '#f59e0b' : isOpen ? '#22c55e' : '#ef4444';
  const textColor = saving ? 'grey.500' : isOverride ? '#92400e' : isOpen ? '#16a34a' : '#dc2626';
  const scheduleLabel = autoIsOpen !== null
    ? ` (schedule: ${autoIsOpen ? 'open' : 'closed'})`
    : '';


  return (
    <>
      <Tooltip
        title={
          saving
            ? 'Saving...'
            : isOpen
              ? `Restaurant is OPEN — click to close${isOverride ? scheduleLabel + ' ⚠ manual override active' : ''}`
              : `Restaurant is CLOSED — click to open${isOverride ? scheduleLabel + ' ⚠ manual override active' : ''}`
        }
      >
        <Chip
          id="restaurant-status-toggle"
          onClick={() => !saving && setConfirmOpen(true)}
          icon={
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: chipColor,
                flexShrink: 0,
                animation: isOpen && !saving ? 'restaurantPulse 2s infinite' : 'none',
                '@keyframes restaurantPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.35 },
                },
              }}
            />
          }
          label={
            saving
              ? 'Saving...'
              : isMobile
                ? undefined
                : isOverride
                  ? (isOpen ? 'OPEN*' : 'CLOSED*')
                  : (isOpen ? 'OPEN' : 'CLOSED')
          }
          variant="outlined"
          size="small"
          sx={{
            borderColor: chipColor,
            color: textColor,
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            cursor: saving ? 'default' : 'pointer',
            minWidth: isMobile ? 36 : 90,
            '&:hover': {
              bgcolor: saving
                ? 'transparent'
                : isOpen
                  ? 'rgba(34,197,94,0.08)'
                  : 'rgba(239,68,68,0.08)',
            },
            transition: 'all 0.3s ease',
          }}
        />
      </Tooltip>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 400, width: '100%' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          {isOpen ? (
            <><CancelOutlined color="error" /> Close Restaurant?</>
          ) : (
            <><CheckCircleOutline color="success" /> Open Restaurant?</>
          )}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {isOpen
              ? 'Closing will prevent customers from placing immediate orders. Ensure you set when the restaurant will reopen.'
              : 'Opening the restaurant will allow customers to browse the menu and place new orders immediately.'}
          </Typography>

          {isOpen && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Re-open Time (Required)</InputLabel>
                <Select
                  value={reopenOption}
                  onChange={(e) => setReopenOption(e.target.value)}
                  notched
                  label="Re-open Time (Required)"
                >
                  <MenuItem value="30_min">In 30 minutes</MenuItem>
                  <MenuItem value="1_hour">In 1 hour</MenuItem>
                  <MenuItem value="2_hour">In 2 hours</MenuItem>
                  <MenuItem value="tomorrow">Tomorrow Opening Time</MenuItem>
                  <MenuItem value="custom">Custom Time</MenuItem>
                </Select>
              </FormControl>

              {reopenOption === 'custom' && (
                <TextField
                  label="Select Time"
                  type="time"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={customReopenTime}
                  onChange={(e) => setCustomReopenTime(e.target.value)}
                  inputProps={{ step: 300 }} // 5 min
                  required
                />
              )}

              <TextField
                label="Reason for Closing (Internal / Optional)"
                size="small"
                fullWidth
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="e.g., Short-staffed, kitchen overwhelmed"
              />

              <TextField
                label="Customer Display Message"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                helperText="This message will be shown to customers when they try to order."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={isOpen ? 'error' : 'success'}
            onClick={handleConfirm}
            id={isOpen ? 'btn-confirm-close-restaurant' : 'btn-confirm-open-restaurant'}
          >
            {isOpen ? 'Yes, Close Restaurant' : 'Yes, Open Restaurant'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }: LayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading, availableTenants, switchTenant, tenantSlug: authTenantSlug, activeRole } = useAuth(); // Added availableTenants, switchTenant, tenantSlug
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const tenantSlug = authTenantSlug || urlSlug;
  const { notifications } = useNotifications();
  const { settings, updateSettings } = useSettings();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [addStoreOpen, setAddStoreOpen] = useState(false); // New state

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const currentDrawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  // Sub-menu for tenants if needed, or just list them
  // For simplicity, we list them in the main menu with a divider

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleSwitchTenant = (slug: string) => {
    handleProfileMenuClose();
    switchTenant(slug);
  };

  const handleProfile = () => {
    handleProfileMenuClose();
    navigate('profile');
  };

  const handleSettings = () => {
    handleProfileMenuClose();
    navigate('settings');
  };
  const handleNotificationToggle = () => {
    setNotificationOpen(!notificationOpen);
  };

  const handleAddStore = () => {
    handleProfileMenuClose();
    setAddStoreOpen(true);
  };

  const handleAddStoreSuccess = (slug: string) => {
    // Refresh user context or just switch
    // ideally switchTenant logic handles it -> redirects to login with targetTenant
    switchTenant(slug);
  };

  // Authentication guard - redirect to login if not authenticated
  React.useEffect(() => {
    // Wait for auth loading to complete
    if (isLoading) {
      return;
    }

    // Public paths that skip authentication
    const publicPaths = [
      'customer/order',
      'customer/catering',
      'customer/book-table'
    ];

    const isPublicPath = publicPaths.some(path => location.pathname.includes(path));

    const token = localStorage.getItem('jwt');
    console.log('Layout: Checking auth. Path:', location.pathname, 'Public:', isPublicPath, 'Token:', !!token, 'User:', !!user);

    if (!isPublicPath && (!token || !user)) {
      console.log('Layout: No authentication found and NOT a public path, redirecting to login. Token:', !!token, 'User:', !!user);
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, isLoading, navigate, location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const publicPaths = [
    'customer/order',
    'customer/catering',
    'customer/book-table'
  ];
  const isPublicPath = publicPaths.some(path => location.pathname.includes(path));

  // Don't render layout if not authenticated and NOT a public path
  if (!user && !isPublicPath) {
    return null;
  }

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/pos')) return 'POS';
    if (path.includes('/orders')) return 'Orders';
    if (path.includes('/kitchen')) return 'Kitchen View';
    if (path.includes('/menu')) return 'Menu Management';
    if (path.includes('/tables')) return 'Table Management';
    if (path.includes('/inventory')) return 'Inventory';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/profile')) return 'Profile';
    return '';
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          transition: 'width 0.3s ease, margin-left 0.3s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Sidebar Collapse Toggle - Desktop Only */}
          <Tooltip title={sidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
            <IconButton
              color="inherit"
              onClick={handleSidebarCollapse}
              sx={{
                mr: 1,
                display: { xs: 'none', md: 'flex' },
                bgcolor: 'action.hover',
                borderRadius: '8px',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>

          {/* <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography> */}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShiftManager />
            <SubscriptionStatus />
            <RestaurantStatusToggle />
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationToggle}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Quick Theme Toggle */}
            <Tooltip title={`Switch to ${theme.palette.mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton
                color="inherit"
                onClick={async () => {
                  const newTheme = theme.palette.mode === 'light' ? 'dark' : 'light';
                  const newSystemSettings = {
                    ...settings.system,
                    theme: newTheme
                  };

                  try {
                    // 1. Update backend
                    const { settingsAPI } = await import('src/services/api');
                    await settingsAPI.update('system', newSystemSettings);

                    // 2. Update local state for immediate reflected change
                    const newSettings = {
                      ...settings,
                      system: newSystemSettings
                    };
                    updateSettings(newSettings);
                  } catch (e) {
                    console.error('Failed to update theme preference', e);
                  }
                }}
              >
                {theme.palette.mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            {/* Account: Login button for guests, Avatar for authenticated users */}
            {!user ? (
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate(tenantSlug ? `/${tenantSlug}/register` : '/register', { state: { from: location.pathname } })}
                sx={{
                  ml: 1,
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 2.5,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: '0 4px 12px rgba(79,70,229,0.4)' },
                }}
              >
                Register
              </Button>
            ) : (
              <Tooltip title="Account">
                <IconButton onClick={handleProfileMenuOpen} color="inherit" sx={{ ml: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }} src={user?.avatar}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfile}>
          <Avatar sx={{ width: 24, height: 24, mr: 1 }} />
          Profile
        </MenuItem>

        {availableTenants && availableTenants.length > 1 && activeRole !== 'customer' && (
          <Box>
            <Divider sx={{ my: 1 }}>
              <Typography variant="caption" sx={{ px: 1, color: 'text.secondary' }}>
                Switch Restaurant
              </Typography>
            </Divider>
            {availableTenants.map((tenant) => (
              <MenuItem
                key={tenant.slug}
                onClick={() => handleSwitchTenant(tenant.slug)}
                selected={tenant.slug === tenantSlug}
                sx={{ pl: 2 }}
              >
                <Typography variant="body2" sx={{ fontWeight: tenant.slug === tenantSlug ? 'bold' : 'normal' }}>
                  {tenant.name}
                </Typography>
              </MenuItem>
            ))}
            {activeRole === 'admin' && (
              <MenuItem onClick={handleAddStore} sx={{ color: 'primary.main' }}>
                <Add fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" fontWeight="bold">
                  Add New Restaurant
                </Typography>
              </MenuItem>
            )}
          </Box>
        )}

        {/* If no multiple tenants, still show Add Store option? Yes, maybe inside Settings or separate?
            Let's add it always for Owners. How to check owner? 
            For now, add it to main menu as well if list is empty?
            Or better: Just put it above Settings. 
        */}
        {(!availableTenants || availableTenants.length <= 1) && activeRole === 'admin' ? (
          <MenuItem onClick={handleAddStore}>
            <Add fontSize="small" sx={{ mr: 1 }} />
            Add New Restaurant
          </MenuItem>
        ) : null}


        <Divider />
        {['admin', 'manager'].includes(activeRole || '') && (
          <MenuItem onClick={handleSettings}>
            <Settings fontSize="small" sx={{ mr: 1 }} />
            Settings
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
      <Box component="nav" sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease' }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH_EXPANDED,
            },
          }}
        >
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
            },
          }}
          open
        >
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={handleSidebarCollapse} />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: 'background.default',
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
        }}
      >
        {/* Stylish Watermark */}
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: { md: `calc(50% + ${currentDrawerWidth / 2}px)`, xs: '50%' },
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            opacity: 0.03,
            pointerEvents: 'none',
            zIndex: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            filter: 'grayscale(100%)',
            transition: 'left 0.3s ease',
          }}
        >
          {/* If you have a logo, uncomment and use it */}
          {settings.restaurant.logo ? (
            <img
              src={settings.restaurant.logo}
              alt="watermark"
              style={{
                width: 300,
                marginBottom: 20,
                opacity: 0.8  // Since parent has 0.03 opacity, this inner opacity matters less but good for control if we change parent
              }}
            />
          ) : null}

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', md: '8rem' },
              fontWeight: 900,
              color: 'text.primary',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            {settings.restaurant.name || user?.tenantName || 'POS SYSTEM'}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '1.5rem', md: '3rem' },
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5em',
              mt: 2
            }}
          >
            PREMIUM DINING
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <SubscriptionBanner />
          {children || <Outlet />}
        </Box>
      </Box>
      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        notifications={notifications}
      />

      <AddRestaurantDialog
        open={addStoreOpen}
        onClose={() => setAddStoreOpen(false)}
        onSuccess={handleAddStoreSuccess}
      />
    </Box >
  );
};

export default Layout;
