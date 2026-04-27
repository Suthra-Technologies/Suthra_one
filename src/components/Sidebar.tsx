import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
  Typography
} from '@mui/material';
import {
  Dashboard,
  ShoppingCart,
  Restaurant,
  TableRestaurant,
  Inventory,
  ShoppingBag,
  MenuBook,
  People,
  Assessment,
  Receipt,
  PointOfSale,
  Kitchen,
  Person,
  Settings,
  AdminPanelSettings,
  LocalOffer,
  Event as EventIcon,
  Help,
  AutoStories,
  DeleteSweep,
  AccessTime as AccessTimeIcon,
  ChevronLeft,
  ChevronRight,
  Celebration,
  Store as VendorIcon,
  Assignment,
  MonetizationOn,
  ConfirmationNumber,
  AccountBox,
  ExpandLess,
  ExpandMore,
  HeadsetMic,
  Forum,
  Public as WebIcon,
  DashboardCustomize,
} from '@mui/icons-material';
import { Collapse } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import { BRAND_CONFIG } from '../config/brandConfig';
import { Capacitor } from '@capacitor/core';

/**
 * Ensures image URLs are absolute.
 * On Capacitor native apps, relative URLs (e.g. '/uploads/logo.png') resolve
 * against 'capacitor://localhost' instead of the real backend server.
 * This helper prepends the API base URL for any relative path.
 */
const resolveImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  // Already absolute or data-URI → use as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  // Build server origin from BRAND_CONFIG / env
  const raw = (BRAND_CONFIG.apiBaseUrl as string) || '';
  const origin = raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (!origin) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface SidebarProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick, collapsed = false, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, activeRole, switchRole, getUserFullName } = useAuth();
  const { slug, getRelativePath } = useActiveTenant();
  const { settings } = useSettings();
  const restaurantSettings = settings?.restaurant || {};
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));

  const handleNavigation = (path: string) => {
    navigate(getRelativePath(path));
    if (onItemClick) onItemClick();
  };

  const [roleAnchorEl, setRoleAnchorEl] = React.useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = React.useState<{ [key: string]: boolean }>({});
  const [collapsedAnchorEl, setCollapsedAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeCollapsedItem, setActiveCollapsedItem] = React.useState<any>(null);
  const timeoutRef = React.useRef<any>(null);

  const handleCollapsedMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    if (collapsed) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCollapsedAnchorEl(event.currentTarget);
      setActiveCollapsedItem(item);
    }
  };

  const handleCollapsedMenuClose = () => {
    timeoutRef.current = setTimeout(() => {
      setCollapsedAnchorEl(null);
      setActiveCollapsedItem(null);
    }, 150);
  };

  const handleMenuEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleRoleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (user?.roles && user.roles.length > 1) {
      setRoleAnchorEl(e.currentTarget);
    }
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleRoleSwitch = (role: string) => {
    switchRole(role);
    setRoleAnchorEl(null);
    handleNavigation('/dashboard');
  };

  const navigationGroups = [
    {
      title: 'MAIN',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: <Dashboard />, roles: ['admin', 'manager', 'waiter', 'cashier', 'food_runner'] },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { path: '/orders', label: 'Orders', icon: <ShoppingCart />, roles: ['admin', 'manager', 'waiter', 'cashier', 'delivery', 'food_runner'] },
        { path: '/pos', label: 'Point of Sale', icon: <PointOfSale />, roles: ['admin', 'manager', 'waiter', 'cashier'] },
        { path: '/tables', label: 'Tables', icon: <TableRestaurant />, roles: ['admin', 'manager', 'waiter', 'cashier'] },
        { path: '/bookings', label: 'Bookings', icon: <EventIcon />, roles: ['admin', 'manager'] },
        {
          label: 'Catering',
          icon: <Celebration />,
          roles: ['admin', 'manager'],
          feature: 'catering',
          children: [
            { path: '/catering-admin', label: 'Catering Management', icon: <Assignment /> },
            { path: '/catering-commissions', label: 'Commissions', icon: <MonetizationOn /> },
          ]
        },
        { path: '/kot', label: 'Kitchen Display', icon: <Receipt />, roles: ['admin', 'manager', 'kitchen_staff'] },
        { path: '/kitchen', label: 'Kitchen Orders', icon: <Kitchen />, roles: ['admin', 'manager', 'kitchen_staff'] },
        { path: '/customer/order', label: 'Order Online', icon: <PointOfSale />, roles: ['customer'] },
        { path: '/customer/book-table', label: 'Book Table', icon: <EventIcon />, roles: ['customer'] },
        { path: '/customer/catering', label: 'Catering Service', icon: <Celebration />, roles: ['customer'], feature: 'catering' },
        { path: '/customer/bookings', label: 'My Activity', icon: <EventIcon />, roles: ['customer'] },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { path: '/menu', label: 'Menu', icon: <Restaurant />, roles: ['admin', 'manager'] },
        { path: '/inventory', label: 'Inventory', icon: <Inventory />, roles: ['admin', 'manager'], feature: 'inventory' },
        { path: '/inventory/waste', label: 'Wastage Management', icon: <DeleteSweep />, roles: ['admin', 'manager'], feature: 'wastemanagement' },
        { path: '/purchase-orders', label: 'Purchase Orders', icon: <ShoppingBag />, roles: ['admin', 'manager'] },
        { path: '/vendors', label: 'Vendors', icon: <VendorIcon />, roles: ['admin', 'manager'] },
        // { path: '/recipes', label: 'Recipes', icon: <MenuBook />, roles: ['admin', 'manager'] },
        { path: '/promocode', label: 'Promo Code', icon: <LocalOffer />, roles: ['admin', 'manager'] },
        { path: '/coupons', label: 'Coupons', icon: <ConfirmationNumber />, roles: ['admin', 'manager'] },
        { path: '/users', label: 'Users', icon: <People />, roles: ['admin', 'manager'] },
        { path: '/customers', label: 'Customers', icon: <AccountBox />, roles: ['admin', 'manager'] },
        { path: '/attendance', label: 'Attendance', icon: <AccessTimeIcon />, roles: ['admin', 'manager'], feature: 'attendance' },
      ]
    },
    {
      title: 'APPLICATION SETTINGS',
      items: [
        { path: '/customise-screens', label: 'Customise Screens', icon: <DashboardCustomize />, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { path: '/reports', label: 'Reports', icon: <Assessment />, roles: ['admin', 'manager'] },
        { path: '/service-usage', label: 'Service Usage', icon: <WebIcon />, roles: ['admin', 'manager'] },
        { path: '/invoices', label: 'Invoices', icon: <Receipt />, roles: ['admin', 'superadmin'], laptopOnly: true },
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'Profile', icon: <Person />, roles: ['admin', 'manager', 'waiter', 'cashier', 'delivery', 'customer'] },
        { path: '/subscription', label: 'Subscription', icon: <AdminPanelSettings />, roles: ['admin'], hideOnIOS: true, laptopOnly: true },
        { path: '/support', label: 'Super Admin Support', icon: <HeadsetMic />, roles: ['admin', 'manager'] },
        { path: '/customer-support', label: 'Customer Tickets', icon: <Forum />, roles: ['admin', 'manager'] },
        { path: '/settings', label: 'Settings', icon: <Settings />, roles: ['admin', 'manager'] },
        { path: '', label: 'Help & Guide', icon: <AutoStories />, roles: ['admin', 'manager', 'waiter', 'cashier', 'kitchen_staff', 'delivery', 'food_runner'], isAction: true, action: () => window.open('https://helpguide.restaurant.nexzenpos.com/#login', '_blank') },
      ]
    },
  ];

  const isActiveRoute = (path: string) => {
    const normalizedPath = location.pathname.replace(`/${slug}`, '') || '/';
    // If we are on subdomain, clean path is just location.pathname
    // If we are on path-base, clean path is normalizedPath
    const currentPath = slug && location.pathname.startsWith(`/${slug}`) ? normalizedPath : location.pathname;
    return currentPath === path;
  };

  const tenantConfig: any = user?.tenant;
  const currentFeatures = tenantConfig?.currentPlan?.features || [];
  const hasSuperAdmin = activeRole === 'superadmin' || user?.roles?.includes('superadmin');

  const hasFeatureAccess = (feat?: string) => {
    if (!feat) return true;
    if (hasSuperAdmin) return true;
    if (activeRole === 'customer') return true; // Let routing logic or backend handle customer if needed, but since we are modifying UI, maybe hide it. Customer does not have tenant context easily. Wait, user.tenant might be there. If not there, maybe we just hide? Actually customer bypasses RequireFeature. Let's return true for customer.
    return currentFeatures.includes(feat);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      <Box
        sx={{
          position: { xs: 'sticky', md: 'static' },
          top: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))', md: 0 },
          zIndex: { xs: 2, md: 'auto' },
          bgcolor: 'background.paper',
          pb: { xs: 1, md: 0 },
        }}
      >
        {/* Logo / Header */}
        <Box sx={{
          mt: { xs: 0.5, sm: 2.5 },
          px: collapsed ? 1 : 2,
          py: collapsed ? 1.5 : { xs: 1.25, sm: 2.5 },
          textAlign: 'center',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {(restaurantSettings.logo || (user?.tenant as any)?.logo) ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
              <Avatar
                src={resolveImageUrl(restaurantSettings.logo || (user?.tenant as any)?.logo)}
                alt={restaurantSettings.name || (user?.tenant as any)?.name || 'Restaurant Logo'}
                sx={{
                  mt: { xs: 0, sm: 0.5, md: 1 },
                  width: collapsed ? 36 : { xs: 52, sm: 56, md: 68 },
                  height: collapsed ? 36 : { xs: 52, sm: 56, md: 68 },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}
              />
              {!collapsed && (
                <Typography fontWeight={700} sx={{
                  color: 'text.primary',
                  letterSpacing: 0.3,
                  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1rem' },
                  textAlign: 'center',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  px: 1,
                }}>
                  {restaurantSettings.name || (user?.tenant as any)?.name || 'Restaurant POS'}
                </Typography>
              )}
            </Box>
          ) : (
            <>
              {!collapsed ? (
                <Box sx={{ width: '100%', overflow: 'hidden', px: 1 }}>
                  <Typography fontWeight={900} sx={{
                    background: 'linear-gradient(45deg, #4F46E5 30%, #EC4899 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                    fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    textAlign: 'center',
                  }}>
                    {restaurantSettings.name || (user?.tenant as any)?.name || 'POS SYSTEM'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: 2, textTransform: 'uppercase', display: 'block', textAlign: 'center' }}>
                    Premium Dining
                  </Typography>
                </Box>
              ) : (
                <Avatar sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                }}>
                  {(restaurantSettings.name || (user?.tenant as any)?.name || 'P').charAt(0).toUpperCase()}
                </Avatar>
              )}
            </>
          )}
        </Box>

        {/* User Info Card */}
        <Tooltip title={collapsed ? `${getUserFullName()} - ${activeRole}` : ''} placement="right">
          <Box
            sx={{
              mx: collapsed ? 1 : 2,
              mb: 2,
              p: collapsed ? 1 : 2,
              borderRadius: 3,
              bgcolor: alpha(activeRole === 'admin' ? '#4F46E5' : '#111827', 0.05),
              border: '1px solid',
              borderColor: 'divider',
              cursor: user?.roles && user.roles.length > 1 ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
              display: 'flex',
              justifyContent: 'center',
            }}
            onClick={handleRoleClick}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 1.5 }}>
              <Avatar sx={{
                bgcolor: alpha(activeRole === 'admin' ? '#4F46E5' : '#111827', 0.1),
                color: activeRole === 'admin' ? '#4F46E5' : '#111827',
                width: collapsed ? 32 : 36,
                height: collapsed ? 32 : 36,
                transition: 'all 0.3s ease',
              }}>
                {activeRole?.charAt(0).toUpperCase()}
              </Avatar>
              {!collapsed && (
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle2" fontWeight="bold" noWrap>
                    {getUserFullName()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {activeRole === 'admin' ? 'Administrator' : activeRole}
                    {user?.roles && user.roles.length > 1 && ' ▾'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={roleAnchorEl}
        open={Boolean(roleAnchorEl)}
        onClose={() => setRoleAnchorEl(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
      >
        {user?.roles?.map((role) => (
          <MenuItem key={role} onClick={() => handleRoleSwitch(role)} selected={role === activeRole}>
            <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: role === activeRole ? 'bold' : 'normal' }}>
              {role}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {navigationGroups.map((group, groupIndex) => {
          const filteredItems = (group.items as any[]).filter(item => {
            const roleMatch = !item.roles || (activeRole && item.roles.includes(activeRole));
            const featureMatch = hasFeatureAccess(item.feature);
            const iosHideMatch = item.hideOnIOS && Capacitor.getPlatform() === 'ios';
            const laptopOnlyMatch = item.laptopOnly && isMobileOrTablet;
            return roleMatch && featureMatch && !iosHideMatch && !laptopOnlyMatch;
          });

          if (filteredItems.length === 0) return null;

          return (
            <Box key={groupIndex} sx={{ mb: 2 }}>
              {!collapsed && (
                <Box sx={{ px: 3, pt: 1, pb: 1 }}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    sx={{ color: 'text.secondary', opacity: 0.7, letterSpacing: 1.5 }}
                  >
                    {group.title}
                  </Typography>
                </Box>
              )}
              {collapsed && groupIndex > 0 && (
                <Divider sx={{ mx: 1, my: 1 }} />
              )}
              <List sx={{ px: collapsed ? 1 : 2, py: 0 }}>
                {filteredItems.map((item: any, itemIndex) => {
                  const hasChildren = (item as any).children && (item as any).children.length > 0;
                  const isOpen = openGroups[item.label] || false;
                  const active = isActiveRoute(item.path || '');

                  const renderItem = (navItem: any, isChild = false) => {
                    const navActive = isActiveRoute(navItem.path || '');
                    const navHasChildren = navItem.children && navItem.children.length > 0;

                    return (
                      <ListItem disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          onClick={(e) => {
                            if (navHasChildren) {
                              if (collapsed) {
                                handleCollapsedMenuOpen(e, navItem);
                              } else {
                                toggleGroup(navItem.label);
                              }
                            } else if (navItem.isAction && navItem.action) {
                              navItem.action();
                            } else if (navItem.path) {
                              handleNavigation(navItem.path);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (collapsed && navHasChildren) {
                              handleCollapsedMenuOpen(e, navItem);
                            }
                          }}
                          onMouseLeave={handleCollapsedMenuClose}
                          selected={navActive && !navItem.isAction}
                          sx={{
                            borderRadius: '12px',
                            py: isChild ? 0.8 : 1.2,
                            px: collapsed ? 1.5 : (isChild ? 4 : 2),
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            minWidth: 0,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                              '&:hover': {
                                bgcolor: 'primary.dark',
                              },
                            },
                            '&:hover': {
                              bgcolor: navActive ? 'primary.dark' : alpha('#4F46E5', 0.08),
                              transform: collapsed ? 'scale(1.05)' : (isChild ? 'translateX(2px)' : 'translateX(4px)'),
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: collapsed ? 0 : 40,
                              color: navActive ? 'inherit' : 'text.secondary',
                              transition: 'color 0.3s ease',
                              justifyContent: 'center',
                            }}
                          >
                            {navItem.icon}
                          </ListItemIcon>
                          {!collapsed && (
                            <>
                              <ListItemText
                                primary={navItem.label}
                                sx={{
                                  '& .MuiListItemText-primary': {
                                    fontSize: isChild ? '0.85rem' : '0.9rem',
                                    fontWeight: navActive ? 600 : 500,
                                    color: navActive ? 'inherit' : 'text.primary',
                                  },
                                }}
                              />
                              {navHasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
                            </>
                          )}
                        </ListItemButton>
                      </ListItem>
                    );
                  };

                  return (
                    <Box key={itemIndex}>
                      {collapsed && !hasChildren ? (
                        <Tooltip title={item.label} placement="right" arrow>
                          {renderItem(item)}
                        </Tooltip>
                      ) : (
                        renderItem(item)
                      )}

                      {!collapsed && hasChildren && (
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {(item as any).children.map((child: any, childIndex: number) => (
                              <React.Fragment key={childIndex}>
                                {renderItem(child, true)}
                              </React.Fragment>
                            ))}
                          </List>
                        </Collapse>
                      )}
                    </Box>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>



      {/* <Box sx={{ p: collapsed ? 1 : 2, mt: 'auto' }}>
        {!collapsed && (
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Version 1.0.0
          </Typography>
        )}
      </Box> */}


      {/* Submenu for Collapsed Sidebar */}
      <Menu
        anchorEl={collapsedAnchorEl}
        open={Boolean(collapsedAnchorEl)}
        onClose={handleCollapsedMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          pointerEvents: 'none',
          '& .MuiPaper-root': {
            pointerEvents: 'auto',
            ml: 1.5,
            minWidth: 200,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid',
            borderColor: 'divider',
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
          }
        }}
        MenuListProps={{
          onMouseEnter: handleMenuEnter, 
          onMouseLeave: handleCollapsedMenuClose,
          sx: { py: 0.5 }
        }}
        disableRestoreFocus
        disableEnforceFocus
        slotProps={{
          backdrop: {
            sx: { pointerEvents: 'none', backgroundColor: 'transparent' }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.05) }}>
          <Typography variant="caption" fontWeight="bold" sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1 }}>
            {activeCollapsedItem?.label}
          </Typography>
        </Box>
        {activeCollapsedItem?.children?.map((child: any, idx: number) => {
          const childActive = isActiveRoute(child.path || '');
          return (
            <MenuItem
              key={idx}
              onClick={() => {
                handleNavigation(child.path);
                handleCollapsedMenuClose();
              }}
              sx={{
                py: 1,
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                bgcolor: childActive ? alpha('#4F46E5', 0.1) : 'transparent',
                color: childActive ? 'primary.main' : 'text.primary',
                '&:hover': {
                  bgcolor: alpha('#4F46E5', 0.15),
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                {child.icon}
              </ListItemIcon>
              <ListItemText 
                primary={child.label} 
                primaryTypographyProps={{ 
                  variant: 'body2',
                  fontWeight: childActive ? 600 : 500
                }} 
              />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};

export default Sidebar;